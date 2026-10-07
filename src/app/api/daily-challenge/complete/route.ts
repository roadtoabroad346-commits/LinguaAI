import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { challengeCompleteSchema } from "@/lib/dashboard/schemas";
import { getDailyChallenge, gradeDailyChallenge } from "@/lib/dashboard/daily-challenge";
import { awardXp } from "@/lib/dashboard/award";
import { XP_RULES } from "@/lib/gamification/xp-rules";
import { dayDiff, todayKeyTz } from "@/lib/dashboard/streak";

/**
 * Grades the Daily Challenge deterministically, records completion + XP.
 * Signed-out users get a grade without saving (preview mode).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = challengeCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid answers.", issues: parsed.error.flatten() }, { status: 400 });
  }

  let supabase = null;
  let userId: string | null = null;
  let level = null;
  let timezone = "UTC";
  try {
    supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("level,timezone").eq("id", userId).maybeSingle();
      level = ((profile ?? {}) as { level: null }).level ?? null;
      timezone = ((profile ?? {}) as { timezone?: string | null }).timezone ?? "UTC";
    }
  } catch {
    supabase = null;
  }

  // Server-authoritative date: the challenge belongs to the learner's local day.
  // The client's key is honored within ±1 day (travel / stale-page tolerance);
  // anything further out falls back to today so completions stay unique per day.
  const tzToday = todayKeyTz(new Date(), timezone);
  let dateKey = tzToday;
  try {
    if (Math.abs(dayDiff(parsed.data.dateKey, tzToday)) <= 1) dateKey = parsed.data.dateKey;
  } catch {
    dateKey = tzToday;
  }
  const challenge = getDailyChallenge(dateKey, level as never);
  const grade = gradeDailyChallenge(challenge, parsed.data.answers);

  if (!supabase || !userId) {
    return NextResponse.json({ ...grade, saved: false, streak: null });
  }

  // Idempotency: one completion per day. Re-submits return the stored result.
  const { data: existing } = await supabase
    .from("daily_challenge_completions")
    .select("score,total,xp_earned")
    .eq("user_id", userId)
    .eq("challenge_date", dateKey)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ...grade, saved: true, repeated: true, stored: existing });
  }

  const { error: insertError } = await supabase.from("daily_challenge_completions").insert({
    user_id: userId,
    challenge_date: dateKey,
    score: grade.score,
    total: grade.total,
    xp_earned: grade.xpEarned,
  } as never);
  if (insertError) {
    return NextResponse.json({ ...grade, saved: false, error: "Could not save completion." }, { status: 500 });
  }

  let streak = null;
  let xpToday = grade.xpEarned;
  if (grade.xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: grade.xpEarned,
        source: "daily_challenge",
        activityKind: "daily_challenge",
        activityTitle: `Daily Challenge ${dateKey} — ${grade.score}/${grade.total}`,
        activityHref: "/daily-challenge",
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // XP insert failed but completion is stored; report grade anyway.
    }
  } else {
    // Zero-XP attempt still counts toward the streak (showed up and practiced).
    try {
      const res = await awardXp(supabase, userId, { amount: XP_RULES.challengeAttempt, source: "daily_challenge_attempt", activityKind: "daily_challenge", activityTitle: `Daily Challenge ${dateKey} — ${grade.score}/${grade.total}`, activityHref: "/daily-challenge" });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch { /* non-fatal */ }
  }

  // Phase 7 — unlock challenge achievements (best effort).
  let newAchievements: string[] = [];
  try {
    const keys = ["warm-up", ...(grade.perfect ? ["perfect-day"] : [])];
    for (const key of keys) {
      await supabase.from("achievements").upsert({ user_id: userId, key } as never, { onConflict: "user_id,key" } as never);
    }
    newAchievements = keys;
  } catch {
    newAchievements = [];
  }

  return NextResponse.json({ ...grade, saved: true, streak, xpToday, todayKey: tzToday, dateKey, newAchievements });
}
