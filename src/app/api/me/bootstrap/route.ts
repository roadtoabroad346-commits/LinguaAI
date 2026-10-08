import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { todayKeyTz, startOfDayUtc } from "@/lib/dashboard/streak";

export const dynamic = "force-dynamic";

/**
 * GET /api/me/bootstrap — one consistent hydration document for the app shell.
 * no-store, validated via getUser (never getSession alone), 401 when anonymous.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { configured: false, signedIn: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json(
      { configured: false, signedIn: false },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json(
      { configured: true, signedIn: false },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  const p = (profile ?? {}) as Record<string, unknown>;

  const timezone = (p.timezone as string | null) ?? "UTC";
  const now = new Date();
  const today = todayKeyTz(now, timezone);
  const since = startOfDayUtc(now, timezone).toISOString();

  const [xpRes, dictRes, placeRes] = await Promise.all([
    supabase.from("xp_events").select("amount,created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("placement_results")
      .select("level,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const xpToday = ((xpRes.data ?? []) as Array<{ amount: number }>).reduce(
    (s, e) => s + (Number(e.amount) || 0),
    0
  );
  const dailyGoalXp = (p.daily_goal_xp as number | null) ?? 30;
  const onboardingCompleted = p.onboarding_completed === true;
  const placementCompleted =
    (p as { placement_completed?: boolean }).placement_completed === true ||
    (typeof p.level === "string" && (p.level as string).length > 0);
  const latestPlacement = (placeRes.data ?? null) as { level: string; created_at: string } | null;

  return NextResponse.json(
    {
      configured: true,
      signedIn: true,
      userId: user.id,
      email: user.email ?? null,
      profile: profile ?? null,
      level: (p.level as string | null) ?? latestPlacement?.level ?? null,
      onboardingCompleted,
      placementCompleted,
      latestPlacement,
      xpToday,
      xpTotal: (p.total_xp as number | null) ?? xpToday,
      streak: {
        current: (p.current_streak as number | null) ?? 0,
        longest: (p.longest_streak as number | null) ?? 0,
      },
      dailyGoalXp,
      goalPct: dailyGoalXp > 0 ? Math.min(100, Math.round((xpToday / dailyGoalXp) * 100)) : 0,
      preferences: (p.preferences as Record<string, unknown> | null) ?? {},
      counts: {
        dictionary: typeof dictRes.count === "number" ? dictRes.count : 0,
      },
      todayKey: today,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
