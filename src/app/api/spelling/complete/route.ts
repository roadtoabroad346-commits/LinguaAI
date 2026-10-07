import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { gradeSpellingSet, repeatedSessionResult, type StoredSpellingSession } from "@/lib/spelling/spelling";
import { spellingCompleteSchema } from "@/lib/spelling/schemas";
import { awardXp } from "@/lib/dashboard/award";
import { evaluateAchievements, type GamStats } from "@/lib/gamification/gamification";

/**
 * Grades a spelling session deterministically, records per-word attempts + XP.
 * Idempotent: re-submitting the same `sessionId` returns the stored grade
 * WITHOUT awarding XP again. Signed-out users get a grade without saving.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = spellingCompleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers.", issues: parsed.error.flatten() }, { status: 400 });

  const grade = gradeSpellingSet(parsed.data.mode, parsed.data.answers);
  const sessionId = parsed.data.sessionId ?? randomUUID();

  let supabase = null;
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      supabase = null;
    }
  }
  if (!supabase || !userId) {
    return NextResponse.json({ ...grade, saved: false, sessionId });
  }

  // Idempotency: a completed session is returned as-is — no new XP, no new rows.
  const { data: storedSession } = await supabase
    .from("spelling_sessions")
    .select("session_id,mode,score,total,xp_earned,perfect")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (storedSession) {
    const s = storedSession as { session_id: string; mode: string; score: number; total: number; xp_earned: number; perfect: boolean };
    const { data: storedAttempts } = await supabase
      .from("spelling_attempts")
      .select("word,correct")
      .eq("user_id", userId)
      .eq("session_id", sessionId);
    const words = ((storedAttempts ?? []) as Array<{ word: string; correct: boolean }>);
    const stored: StoredSpellingSession = {
      sessionId: s.session_id,
      mode: (s.mode ?? parsed.data.mode) as StoredSpellingSession["mode"],
      score: s.score,
      total: s.total,
      correctSlugs: words.filter((w) => w.correct).map((w) => w.word),
      wrongSlugs: words.filter((w) => !w.correct).map((w) => w.word),
      xpEarned: s.xp_earned,
      perfect: s.perfect,
    };
    return NextResponse.json(repeatedSessionResult(stored));
  }

  // First submit: claim the session row. A unique-violation here means a
  // concurrent submit won the race — return its stored grade instead.
  const { error: sessionError } = await supabase.from("spelling_sessions").insert({
    user_id: userId as string,
    session_id: sessionId,
    mode: parsed.data.mode,
    score: grade.score,
    total: grade.total,
    xp_earned: grade.xpEarned,
    perfect: grade.perfect,
  } as never);
  if (sessionError) {
    const { data: raced } = await supabase
      .from("spelling_sessions")
      .select("session_id,mode,score,total,xp_earned,perfect")
      .eq("user_id", userId)
      .eq("session_id", sessionId)
      .maybeSingle();
    if (raced) {
      const s = raced as { session_id: string; mode: string; score: number; total: number; xp_earned: number; perfect: boolean };
      const { data: racedAttempts } = await supabase
        .from("spelling_attempts")
        .select("word,correct")
        .eq("user_id", userId)
        .eq("session_id", sessionId);
      const words = ((racedAttempts ?? []) as Array<{ word: string; correct: boolean }>);
      return NextResponse.json(repeatedSessionResult({
        sessionId: s.session_id,
        mode: (s.mode ?? parsed.data.mode) as StoredSpellingSession["mode"],
        score: s.score,
        total: s.total,
        correctSlugs: words.filter((w) => w.correct).map((w) => w.word),
        wrongSlugs: words.filter((w) => !w.correct).map((w) => w.word),
        xpEarned: s.xp_earned,
        perfect: s.perfect,
      }));
    }
    // Session insert failed for another reason — grade stands, nothing saved.
    return NextResponse.json({ ...grade, saved: false, sessionId, error: "Could not save session." }, { status: 500 });
  }

  // Persist per-word attempts (unique constraint backstops duplicates).
  const rows = parsed.data.answers.map((a) => ({
    user_id: userId as string,
    session_id: sessionId,
    mode: parsed.data.mode,
    word: a.slug.trim().toLowerCase(),
    level: parsed.data.level ?? null,
    correct: grade.correctSlugs.includes(a.slug.trim().toLowerCase()),
    xp_earned: 0,
  }));
  const perWord = grade.xpEarned > 0 && grade.score > 0 ? Math.floor(grade.xpEarned / grade.score) : 0;
  const withXp = rows.map((r) => ({ ...r, xp_earned: r.correct ? perWord : 0 }));
  try {
    await supabase.from("spelling_attempts").upsert(withXp as never, { onConflict: "session_id,word" } as never);
  } catch {
    // Non-fatal: the session row (source of truth for idempotency) is stored.
  }

  let streak = null;
  let xpToday = grade.xpEarned;
  if (grade.xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: grade.xpEarned,
        source: `spelling_${parsed.data.mode}`,
        activityKind: "spelling",
        activityTitle: `Spelling (${parsed.data.mode}) — ${grade.score}/${grade.total}`,
        activityHref: "/spelling",
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // Grade stands even if XP fails.
    }
  }

  // Unlock spelling achievements (best effort).
  let newAchievements: string[] = [];
  try {
    const [profileRes, achRes, spellRes] = await Promise.all([
      supabase.from("profiles").select("total_xp,current_streak,longest_streak").eq("id", userId).maybeSingle(),
      supabase.from("achievements").select("key").eq("user_id", userId),
      supabase.from("spelling_attempts").select("id").eq("user_id", userId).eq("correct", true).limit(5000),
    ]);
    const p = (profileRes.data ?? {}) as { total_xp?: number; current_streak?: number; longest_streak?: number };
    const stats: GamStats = {
      totalXp: p.total_xp ?? 0,
      streakCurrent: p.current_streak ?? 0,
      longestStreak: p.longest_streak ?? 0,
      challengeCompletions: 0,
      challengePerfect: 0,
      spellingCorrect: ((spellRes.data ?? []) as unknown[]).length,
      spellingPerfectSessions: grade.perfect ? 1 : 0,
      dictionaryCount: 0,
    };
    const owned = ((achRes.data ?? []) as Array<{ key: string }>).map((r) => r.key);
    newAchievements = evaluateAchievements(stats, owned).filter((k) => k.startsWith("spelling-") || k.startsWith("first-") || k.startsWith("xp-"));
    for (const key of newAchievements) {
      await supabase.from("achievements").upsert({ user_id: userId, key } as never, { onConflict: "user_id,key" } as never);
    }
  } catch {
    newAchievements = [];
  }

  return NextResponse.json({ ...grade, saved: true, sessionId, streak, xpToday, newAchievements });
}
