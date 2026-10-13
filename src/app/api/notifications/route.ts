import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/security/telemetry";
import { todayKeyTz, startOfDayUtc } from "@/lib/dashboard/streak";
import { computeSkillScores, findWeakAreas, type SkillAttemptLike } from "@/lib/gamification/gamification";
import { isDue } from "@/lib/vocab/mastery";
import { generateNotifications, type NotifSignals } from "@/lib/notifications/generator";
import { inQuietHours, parsePrefs, pastReminderTime } from "@/lib/notifications/prefs";
import { planSync } from "@/lib/notifications/sync";
import type { NotifCategory, NotificationRow } from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" } as const;

/** ISO week key "2026-W42" in the learner's timezone (approx: UTC-based). */
function weekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const patchSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  action: z.enum(["read", "unread", "dismiss", "snooze"]),
  snoozeHours: z.number().int().min(1).max(168).optional(),
});

/**
 * GET /api/notifications — state-derived sync + list.
 * No cron needed: every read reconciles DB rows with live app state
 * (insert missing, re-arm returned conditions, resolve cleared ones).
 */
export async function GET(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: noStore });

  const url = new URL(request.url);
  const view = url.searchParams.get("view") === "history" ? "history" : "active";
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const p = (profile ?? {}) as Record<string, unknown>;
  const prefs = parsePrefs((p.preferences as Record<string, unknown> | undefined)?.notifs);
  const timezone = typeof p.timezone === "string" && p.timezone ? p.timezone : "UTC";
  const now = new Date();
  const today = todayKeyTz(now, timezone);
  const dayStart = startOfDayUtc(now, timezone).toISOString();

  if (!prefs.enabled) {
    return NextResponse.json({ items: [], unreadCount: 0, prefs, disabled: true }, { headers: noStore });
  }

  // Signals (bounded, degrade-safe: a failed query yields empty signal, never 500).
  const safe = async <T>(q: PromiseLike<T>): Promise<T | null> => {
    try {
      return await q;
    } catch {
      return null;
    }
  };
  const [xpRes, dictRes, chalRes, skillRes, weekRes, actRes, studioRes] = await Promise.all([
    safe(supabase.from("xp_events").select("amount").eq("user_id", user.id).gte("created_at", dayStart).limit(2000)),
    safe(supabase.from("dictionary_entries").select("word,mastery,next_review_at").eq("user_id", user.id).limit(2000)),
    safe(supabase.from("daily_challenge_completions").select("id").eq("user_id", user.id).eq("challenge_date", today).maybeSingle()),
    safe(supabase.from("skill_attempts").select("skill,score,total").eq("user_id", user.id).limit(1000)),
    safe(supabase.from("xp_events").select("amount,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(500)),
    safe(supabase.from("activity_events").select("created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1)),
    safe(supabase.from("vocab_cards").select("id,next_review_at").eq("user_id", user.id).limit(5000)),
  ]);

  const xpToday = (((xpRes as { data?: Array<{ amount: number }> } | null)?.data ?? []) as Array<{ amount: number }>).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  );
  const dictRows = (((dictRes as { data?: Array<{ word: string; mastery: number; next_review_at: string | null }> } | null)?.data ?? []) as Array<{ mastery: number; next_review_at: string | null }>);
  const studioRows = (((studioRes as { data?: Array<{ next_review_at: string | null }> } | null)?.data ?? []) as Array<{ next_review_at: string | null }>);
  const dueCount = dictRows.filter((d) => isDue(d.next_review_at, today)).length
    + studioRows.filter((d) => isDue(d.next_review_at, today)).length;
  const challengeDone = Boolean((chalRes as { data?: unknown } | null)?.data);
  const attemptRows: SkillAttemptLike[] = ((((skillRes as { data?: Array<{ skill: string; score: number; total: number }> } | null)?.data ?? []) as Array<{ skill: string; score: number; total: number }>))
    .filter((r) => Number.isFinite(r.score) && Number.isFinite(r.total) && r.total > 0)
    .map((r) => ({ skill: r.skill, score: r.score, total: r.total }));
  const masteryVals = dictRows.filter((d) => Number.isFinite(d.mastery));
  const skills = computeSkillScores(attemptRows, {
    avg: masteryVals.length > 0 ? Math.round(masteryVals.reduce((s, d) => s + d.mastery, 0) / masteryVals.length) : null,
    count: dictRows.length,
  });
  const weakAreas = findWeakAreas(skills, 2).map((w) => ({ skill: w.skill, label: w.label, href: w.href }));
  const weekCutoff = now.getTime() - 7 * 86_400_000;
  const weekXp = ((((weekRes as { data?: Array<{ amount: number; created_at: string }> } | null)?.data ?? []) as Array<{ amount: number; created_at: string }>))
    .filter((e) => new Date(e.created_at ?? 0).getTime() >= weekCutoff)
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const lastAct = ((((actRes as { data?: Array<{ created_at: string }> } | null)?.data ?? []) as Array<{ created_at: string }>)[0]?.created_at ?? null);
  const idleDays = lastAct ? Math.max(0, Math.floor((now.getTime() - new Date(lastAct).getTime()) / 86_400_000)) : null;

  const signals: NotifSignals = {
    today,
    weekKey: weekKey(now),
    onboardingCompleted: p.onboarding_completed === true,
    level: typeof p.level === "string" ? (p.level as string) : null,
    placementCompleted: (p as { placement_completed?: boolean }).placement_completed === true,
    dailyGoalXp: typeof p.daily_goal_xp === "number" ? (p.daily_goal_xp as number) : 30,
    xpToday,
    streakCurrent: typeof p.current_streak === "number" ? (p.current_streak as number) : 0,
    totalXp: typeof p.total_xp === "number" ? (p.total_xp as number) : 0,
    dictCount: dictRows.length + studioRows.length,
    dueCount,
    challengeDone,
    weakAreas,
    weekXp,
    idleDays,
    nudgeDue: pastReminderTime(now, timezone, prefs.reminderTime),
  };

  let generated = generateNotifications(signals);
  generated = generated.filter((g) => prefs.categories[g.category] !== false);
  if (inQuietHours(now, timezone, prefs.quietFrom, prefs.quietTo)) {
    generated = generated.filter((g) => g.priority === "high");
  }

  // Existing rows (missing table -> telemetry-style graceful unavailable).
  const { data: rows, error: rowsError } = await supabase
    .from("notifications")
    .select("id,dedupe_key,read_at,dismissed_at,resolved_at,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (rowsError) {
    if (isMissingTableError(rowsError.message)) {
      return NextResponse.json({ items: [], unreadCount: 0, prefs, unavailable: true }, { headers: noStore });
    }
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500, headers: noStore });
  }
  const existing = new Map(
    ((rows ?? []) as Array<{ dedupe_key: string; dismissed_at: string | null; resolved_at: string | null }>).map((r) => [
      r.dedupe_key,
      { key: r.dedupe_key, dismissedAt: r.dismissed_at, resolvedAt: r.resolved_at },
    ])
  );
  const createdToday = ((rows ?? []) as Array<{ created_at: string }>).filter((r) =>
    (r.created_at ?? "").slice(0, 10) === now.toISOString().slice(0, 10)
  ).length;
  const plan = planSync(generated, existing, { createdToday, dailyMax: prefs.dailyMax });

  if (plan.insert.length > 0) {
    await supabase.from("notifications").insert(
      plan.insert.map((g) => ({
        user_id: user.id,
        dedupe_key: g.key,
        category: g.category,
        priority: g.priority,
        title_key: g.titleKey,
        body_key: g.bodyKey,
        vars: g.vars,
        href: g.href,
        expires_at: g.expiresAt,
      }) as never)
    );
  }
  for (const key of plan.rearm) {
    await supabase.from("notifications").update({ resolved_at: null } as never).eq("user_id", user.id).eq("dedupe_key", key);
  }
  for (const key of plan.resolve) {
    await supabase.from("notifications").update({ resolved_at: now.toISOString() } as never).eq("user_id", user.id).eq("dedupe_key", key);
  }
  // Hygiene: drop expired + ancient history (best-effort).
  try {
    await supabase.from("notifications").delete().eq("user_id", user.id).lt("expires_at", now.toISOString());
    await supabase.from("notifications").delete().eq("user_id", user.id).not("resolved_at", "is", null).lt("resolved_at", new Date(now.getTime() - 30 * 86_400_000).toISOString());
  } catch {
    /* non-fatal */
  }

  let query = supabase.from("notifications").select("*").eq("user_id", user.id);
  if (view === "active") {
    query = query.is("dismissed_at", null).is("resolved_at", null).or(`snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`);
  }
  const { data: items, error: listError } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (listError) {
    return NextResponse.json({ error: "Could not load notifications." }, { status: 500, headers: noStore });
  }
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null)
    .is("dismissed_at", null)
    .is("resolved_at", null)
    .or(`snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`);

  return NextResponse.json(
    {
      items: ((items ?? []) as NotificationRow[]).filter((i) => isValidHref(i.href)),
      unreadCount: unreadCount ?? 0,
      prefs,
      view,
    },
    { headers: noStore }
  );
}

/** PATCH /api/notifications — read / unread / dismiss / snooze (owner-only). */
export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503, headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: noStore });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, headers: noStore });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload.", issues: parsed.error.flatten() }, { status: 400, headers: noStore });
  }
  const { ids, action } = parsed.data;
  const now = new Date().toISOString();
  const patch: Record<string, string | null> =
    action === "read"
      ? { read_at: now }
      : action === "unread"
        ? { read_at: null }
        : action === "dismiss"
          ? { dismissed_at: now }
          : { snoozed_until: new Date(Date.now() + (parsed.data.snoozeHours ?? 24) * 3600_000).toISOString() };

  const { error } = await supabase.from("notifications").update(patch as never).eq("user_id", user.id).in("id", ids);
  if (error) {
    if (isMissingTableError(error.message)) {
      return NextResponse.json({ ok: true, unavailable: true }, { headers: noStore });
    }
    return NextResponse.json({ error: "Could not update notifications." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ ok: true, updated: ids.length }, { headers: noStore });
}

const VALID_HREFS = new Set([
  "/dashboard", "/onboarding", "/placement", "/flashcards", "/daily-challenge",
  "/grammar", "/reading", "/listening", "/speaking", "/writing", "/spelling",
  "/progress", "/smart-path", "/profile", "/vocabulary", "/dictionary",
]);

function isValidHref(href: unknown): boolean {
  if (typeof href !== "string" || !href.startsWith("/")) return false;
  const base = href.split("?")[0];
  if (VALID_HREFS.has(base)) return true;
  return Array.from(VALID_HREFS).some((v) => base.startsWith(v + "/"));
}
