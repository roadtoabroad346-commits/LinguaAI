import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { dateKeyInTimezone, startOfDayUtc, todayKeyTz } from "@/lib/dashboard/streak";
import { ACHIEVEMENTS, computeSkillScores, evaluateAchievements, findWeakAreas, getXpLevel, goalProgressPct, masteryStats, type GamStats, type SkillAttemptLike } from "@/lib/gamification/gamification";

export const dynamic = "force-dynamic";

/** Full gamification snapshot: XP, streak, goal, level, achievements. Auto-unlocks newly earned badges. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, signedIn: false });
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ configured: false, signedIn: false });
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) return NextResponse.json({ configured: true, signedIn: false });

  const { data: profile } = await supabase.from("profiles").select("total_xp,current_streak,longest_streak,daily_goal_xp,level,timezone").eq("id", userId).maybeSingle();
  const p = (profile ?? {}) as { total_xp?: number; current_streak?: number; longest_streak?: number; daily_goal_xp?: number; level?: string | null; timezone?: string | null };
  const timezone = p.timezone ?? "UTC";
  const now = new Date();
  const today = todayKeyTz(now, timezone);

  const dayStart = startOfDayUtc(now, timezone);
  const [xpRes, chalRes, spellRes, dictRes, achRes, weekRes, skillRes, writeRes, speakRes, aloudRes, masteryRes] = await Promise.all([
    supabase.from("xp_events").select("amount").eq("user_id", userId).gte("created_at", dayStart.toISOString()).limit(5000),
    supabase.from("daily_challenge_completions").select("score,total").eq("user_id", userId).limit(500),
    supabase.from("spelling_attempts").select("id,session_id,correct").eq("user_id", userId).order("created_at", { ascending: false }).limit(2000),
    supabase.from("dictionary_entries").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("achievements").select("key,unlocked_at").eq("user_id", userId),
    supabase.from("xp_events").select("amount,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("skill_attempts").select("skill,score,total").eq("user_id", userId).limit(2000),
    supabase.from("writing_submissions").select("score").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("speaking_attempts").select("score").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("read_aloud_attempts").select("accuracy").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("dictionary_entries").select("mastery").eq("user_id", userId).limit(2000),
  ]);

  const xpToday = ((xpRes.data ?? []) as Array<{ amount: number }>).reduce((s, e) => s + (e.amount || 0), 0);
  const challenges = ((chalRes.data ?? []) as Array<{ score: number; total: number }>);
  const spells = ((spellRes.data ?? []) as Array<{ session_id: string; correct: boolean }>);
  const spellingCorrect = spells.filter((s) => s.correct).length;
  // Perfect sessions: group recent attempts by session (a session is perfect when it has ≥1 word and all correct).
  const bySession = new Map<string, { total: number; correct: number }>();
  for (const s of spells) {
    const g = bySession.get(s.session_id) ?? { total: 0, correct: 0 };
    g.total += 1;
    if (s.correct) g.correct += 1;
    bySession.set(s.session_id, g);
  }
  let spellingPerfectSessions = 0;
  for (const g of Array.from(bySession.values())) if (g.total > 0 && g.correct === g.total) spellingPerfectSessions += 1;

  const stats: GamStats = {
    totalXp: p.total_xp ?? 0,
    streakCurrent: p.current_streak ?? 0,
    longestStreak: p.longest_streak ?? 0,
    challengeCompletions: challenges.length,
    challengePerfect: challenges.filter((c) => c.score === c.total).length,
    spellingCorrect,
    spellingPerfectSessions,
    dictionaryCount: typeof dictRes.count === "number" ? dictRes.count : 0,
  };

  const owned = ((achRes.data ?? []) as Array<{ key: string; unlocked_at: string }>);
  const ownedKeys = owned.map((r) => r.key);
  const newlyEarned = evaluateAchievements(stats, ownedKeys);
  for (const key of newlyEarned) {
    try {
      await supabase.from("achievements").upsert({ user_id: userId, key } as never, { onConflict: "user_id,key" } as never);
    } catch {
      // Non-fatal.
    }
  }
  const unlockedSet = new Set([...ownedKeys, ...newlyEarned]);
  const achievements = ACHIEVEMENTS.map((a) => ({ ...a, check: undefined as never, unlocked: unlockedSet.has(a.key) }));

  const dailyGoalXp = p.daily_goal_xp ?? 30;
  const level = getXpLevel(stats.totalXp);

  // Last 7 days XP for the activity strip (keys in the learner's timezone).
  const last7: Array<{ date: string; xp: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(dayStart.getTime() - i * 86_400_000);
    const key = dateKeyInTimezone(d, timezone);
    const xp = ((weekRes.data ?? []) as Array<{ amount: number; created_at: string }>)
      .filter((e) => dateKeyInTimezone(new Date(e.created_at ?? ""), timezone) === key)
      .reduce((s, e) => s + (e.amount || 0), 0);
    last7.push({ date: key, xp });
  }

  // Skill scores across modules (real metrics only — null when no data).
  const mastery = masteryStats(((masteryRes.data ?? []) as Array<{ mastery: number }>));
  const attemptRows: SkillAttemptLike[] = ((skillRes.data ?? []) as Array<{ skill: string; score: number; total: number }>)
    .map((r) => ({ skill: r.skill, score: r.score, total: r.total }));
  for (const w of ((writeRes.data ?? []) as Array<{ score: number }>)) {
    if (Number.isFinite(w.score)) attemptRows.push({ skill: "writing", score: w.score, total: 100 });
  }
  for (const s of ((speakRes.data ?? []) as Array<{ score: number }>)) {
    if (Number.isFinite(s.score)) attemptRows.push({ skill: "speaking", score: s.score, total: 100 });
  }
  for (const r of ((aloudRes.data ?? []) as Array<{ accuracy: number }>)) {
    if (Number.isFinite(r.accuracy)) attemptRows.push({ skill: "read-aloud", score: r.accuracy, total: 100 });
  }
  if (spells.length > 0) {
    attemptRows.push({ skill: "spelling", score: spells.filter((s) => s.correct).length, total: spells.length });
  }
  const skills = computeSkillScores(attemptRows, { avg: mastery.avg, count: mastery.count });
  const weakAreas = findWeakAreas(skills);

  return NextResponse.json({
    configured: true,
    signedIn: true,
    todayKey: today,
    timezone,
    xpToday,
    xpTotal: stats.totalXp,
    streak: { current: stats.streakCurrent, longest: stats.longestStreak },
    dailyGoalXp,
    goalPct: goalProgressPct(xpToday, dailyGoalXp),
    goalDone: xpToday >= dailyGoalXp,
    level,
    stats,
    achievements,
    newlyEarned,
    last7,
    skills,
    weakAreas,
    mastery,
  });
}
