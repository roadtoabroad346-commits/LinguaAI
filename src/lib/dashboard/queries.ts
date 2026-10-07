/** Phase 2 — server-side dashboard aggregation. Graceful when backend is missing. */
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { todayKey, todayKeyTz, startOfDayUtc } from "./streak";
import { getWordOfDay } from "./words";
import { buildRecommendations } from "./recommendations";
import type { ProfileRow } from "@/types/database";

export interface ActivityItem {
  id: string;
  kind: string;
  title: string;
  subtitle: string | null;
  href: string | null;
  xp: number;
  created_at: string;
}

export interface DashboardData {
  configured: boolean;
  signedIn: boolean;
  profile: ProfileRow | null;
  xpToday: number;
  xpTotal: number;
  streak: { current: number; longest: number };
  dailyGoalXp: number;
  goalPct: number;
  goalDone: boolean;
  recentActivity: ActivityItem[];
  challengeDone: boolean;
  challengeScore: number | null;
  wordOfDay: ReturnType<typeof getWordOfDay>;
  recommendations: ReturnType<typeof buildRecommendations>;
  todayKey: string;
}

export const getDashboardData = cache(async (now = new Date()): Promise<DashboardData> => {
  const configured = isSupabaseConfigured();
  const user = configured ? await getSessionUser() : null;
  const profile = user ? await getSessionProfile() : null;
  // All "today" boundaries follow the learner's timezone (UTC by default).
  const timezone = profile?.timezone ?? "UTC";
  const today = user && profile ? todayKeyTz(now, timezone) : todayKey(now);
  const dailyGoalXp = profile?.daily_goal_xp ?? 30;
  const wordOfDay = getWordOfDay(today, profile?.level ?? null);

  if (!configured || !user) {
    // Preview mode: deterministic, no backend.
    const recommendations = buildRecommendations({
      profile: profile ? { level: profile.level, learning_mode: profile.learning_mode, onboarding_completed: profile.onboarding_completed, goals: profile.goals } : null,
      xpToday: 0,
      dailyGoalXp,
      streak: 0,
      challengeDone: false,
      dictionaryCount: 0,
    });
    return {
      configured, signedIn: Boolean(user), profile,
      xpToday: 0, xpTotal: 0,
      streak: { current: 0, longest: 0 },
      dailyGoalXp, goalPct: 0, goalDone: false,
      recentActivity: [], challengeDone: false, challengeScore: null,
      wordOfDay, recommendations, todayKey: today,
    };
  }

  let supabase;
  try {
    supabase = createClient();
  } catch {
    const recommendations = buildRecommendations({ profile: null, xpToday: 0, dailyGoalXp, streak: 0, challengeDone: false, dictionaryCount: 0 });
    return { configured: false, signedIn: false, profile: null, xpToday: 0, xpTotal: 0, streak: { current: 0, longest: 0 }, dailyGoalXp, goalPct: 0, goalDone: false, recentActivity: [], challengeDone: false, challengeScore: null, wordOfDay, recommendations, todayKey: today };
  }

  const since = startOfDayUtc(now, timezone).toISOString();
  const [xpRes, actRes, chalRes, dictRes] = await Promise.all([
    supabase.from("xp_events").select("amount,created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("activity_events").select("id,kind,title,subtitle,href,xp,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("daily_challenge_completions").select("score,total").eq("user_id", user.id).eq("challenge_date", today).maybeSingle(),
    supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const xpToday = ((xpRes.data ?? []) as Array<{ amount: number }>).reduce((s, e) => s + (e.amount || 0), 0);
  const recentActivity = ((actRes.data ?? []) as ActivityItem[]).map((a) => ({ ...a }));
  const challengeDone = Boolean((chalRes.data as { score: number } | null)?.score !== undefined && chalRes.data !== null);
  const challengeScore = (chalRes.data as { score: number } | null)?.score ?? null;
  const dictionaryCount = typeof dictRes.count === "number" ? dictRes.count : 0;

  const recommendations = buildRecommendations({
    profile: profile ? { level: profile.level, learning_mode: profile.learning_mode, onboarding_completed: profile.onboarding_completed, goals: profile.goals } : null,
    xpToday, dailyGoalXp,
    streak: profile?.current_streak ?? 0,
    challengeDone, dictionaryCount,
  });

  // Synthetic "Continue Learning" fallbacks when no activity yet.
  const fallbackActivity: ActivityItem[] = [];
  if (recentActivity.length === 0) {
    if (profile && !profile.onboarding_completed) {
      fallbackActivity.push({ id: "fb-onboarding", kind: "onboarding", title: "Complete onboarding", subtitle: "2 minutes · unlocks your placement test", href: "/onboarding", xp: 0, created_at: new Date().toISOString() });
    } else if (profile && !profile.level) {
      fallbackActivity.push({ id: "fb-placement", kind: "placement", title: "Take the placement test", subtitle: "Find your A1–C1 level", href: "/placement", xp: 0, created_at: new Date().toISOString() });
    } else if (profile?.level) {
      fallbackActivity.push({ id: "fb-challenge", kind: "challenge", title: "Start today's Daily Challenge", subtitle: `Picked for ${profile.level} · 5 questions`, href: "/daily-challenge", xp: 0, created_at: new Date().toISOString() });
    }
  }

  const goalPct = dailyGoalXp > 0 ? Math.min(100, Math.round((xpToday / dailyGoalXp) * 100)) : 0;

  return {
    configured, signedIn: true, profile,
    xpToday,
    xpTotal: profile?.total_xp ?? xpToday,
    streak: { current: profile?.current_streak ?? 0, longest: profile?.longest_streak ?? 0 },
    dailyGoalXp, goalPct, goalDone: xpToday >= dailyGoalXp,
    recentActivity: recentActivity.length > 0 ? recentActivity : fallbackActivity,
    challengeDone, challengeScore,
    wordOfDay, recommendations, todayKey: today,
  };
});
