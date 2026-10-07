import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { todayKeyTz, dateKeyInTimezone } from "@/lib/dashboard/streak";
import {
  computeSkillScores,
  findWeakAreas,
  type SkillAttemptLike,
} from "@/lib/gamification/gamification";
import { isDue } from "@/lib/vocab/mastery";
import { GRAMMAR_TOPICS } from "@/lib/grammar/topics";
import { READING_PASSAGES } from "@/lib/reading/library";
import { LISTENING_TRACKS } from "@/lib/listening/library";
import {
  buildPreviewSmartPath,
  buildSmartPath,
  type MissedWord,
  type SlugStat,
  type SmartPathInput,
  type WritingErrorCount,
} from "@/lib/smart-path/engine";
import type { Level, LearningMode } from "@/types/database";

export const dynamic = "force-dynamic";

const GRAMMAR_TITLES = new Map(GRAMMAR_TOPICS.map((t) => [t.slug, t.title]));
const READING_TITLES = new Map(READING_PASSAGES.map((p) => [p.slug, p.title]));
const LISTENING_TITLES = new Map(LISTENING_TRACKS.map((t) => [t.slug, t.title]));

function slugTitle(skill: string, slug: string): string {
  if (skill === "grammar") return GRAMMAR_TITLES.get(slug) ?? slug;
  if (skill === "reading") return READING_TITLES.get(slug) ?? slug;
  if (skill === "listening" || skill === "dictation") return LISTENING_TITLES.get(slug) ?? slug;
  return slug;
}

function daysBetween(fromIso: string, toDate: Date): number | null {
  const from = new Date(fromIso);
  if (Number.isNaN(from.getTime())) return null;
  return Math.max(0, Math.floor((toDate.getTime() - from.getTime()) / 86_400_000));
}

/**
 * GET /api/smart-path — adaptive "today" plan.
 * Deterministic (zero Gemini tokens): level + weak skills + mistakes +
 * vocabulary mastery + review schedule + learning history.
 */
export async function GET() {
  const now = new Date();
  if (!isSupabaseConfigured()) {
    const today = now.toISOString().slice(0, 10);
    const plan = buildPreviewSmartPath(null, today);
    return NextResponse.json({ configured: false, signedIn: false, preview: true, ...plan, signals: null, reviewQueue: [] });
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    const today = now.toISOString().slice(0, 10);
    const plan = buildPreviewSmartPath(null, today);
    return NextResponse.json({ configured: false, signedIn: false, preview: true, ...plan, signals: null, reviewQueue: [] });
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) {
    const today = now.toISOString().slice(0, 10);
    const plan = buildPreviewSmartPath(null, today);
    return NextResponse.json({ configured: true, signedIn: false, preview: true, ...plan, signals: null, reviewQueue: [] });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("level,learning_mode,goals,timezone,daily_goal_xp,current_streak")
    .eq("id", userId)
    .maybeSingle();
  const p = (profile ?? {}) as {
    level?: Level | null; learning_mode?: LearningMode | null; goals?: string[] | null;
    timezone?: string | null; daily_goal_xp?: number | null; current_streak?: number | null;
  };
  const timezone = p.timezone ?? "UTC";
  const today = todayKeyTz(now, timezone);
  const level = (p.level ?? null) as Level | null;

  const weekAgoIso = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [skillRes, writeRes, speakRes, aloudRes, errRes, spellRes, dictRes, chalRes, xpRes, actRes] = await Promise.all([
    supabase.from("skill_attempts").select("skill,slug,score,total,created_at").eq("user_id", userId).limit(2000),
    supabase.from("writing_submissions").select("score,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("speaking_attempts").select("created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("read_aloud_attempts").select("accuracy").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("writing_errors").select("category").eq("user_id", userId).limit(500),
    supabase.from("spelling_attempts").select("word,correct").eq("user_id", userId).limit(2000),
    supabase.from("dictionary_entries").select("word,mastery,next_review_at").eq("user_id", userId).limit(2000),
    supabase.from("daily_challenge_completions").select("id").eq("user_id", userId).eq("challenge_date", today).maybeSingle(),
    supabase.from("xp_events").select("amount,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("activity_events").select("kind,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ]);

  type SkillRow = { skill: string; slug: string; score: number; total: number; created_at: string };
  const skillRows = ((skillRes.data ?? []) as SkillRow[]).filter((r) => Number.isFinite(r.score) && Number.isFinite(r.total) && r.total > 0);

  // Per-skill accuracy (same augmentation as the gamification summary).
  const attemptRows: SkillAttemptLike[] = skillRows.map((r) => ({ skill: r.skill, score: r.score, total: r.total }));
  const writes = ((writeRes.data ?? []) as Array<{ score: number; created_at: string }>);
  for (const w of writes) if (Number.isFinite(w.score)) attemptRows.push({ skill: "writing", score: w.score, total: 100 });
  const speaks = ((speakRes.data ?? []) as Array<{ created_at: string }>);
  const alouds = ((aloudRes.data ?? []) as Array<{ accuracy: number }>);
  for (const r of alouds) if (Number.isFinite(r.accuracy)) attemptRows.push({ skill: "read-aloud", score: r.accuracy, total: 100 });
  const spells = ((spellRes.data ?? []) as Array<{ word: string; correct: boolean }>);
  if (spells.length > 0) attemptRows.push({ skill: "spelling", score: spells.filter((s) => s.correct).length, total: spells.length });

  const dictEntries = ((dictRes.data ?? []) as Array<{ word: string; mastery: number; next_review_at: string | null }>);
  const masteryVals = dictEntries.filter((d) => Number.isFinite(d.mastery));
  const avgMastery = masteryVals.length > 0 ? Math.round(masteryVals.reduce((s, d) => s + d.mastery, 0) / masteryVals.length) : null;
  const skills = computeSkillScores(attemptRows, { avg: avgMastery, count: dictEntries.length });
  const weakAreas = findWeakAreas(skills);

  // Review schedule: words due on/before today (never-reviewed count as due).
  const dueWords = dictEntries
    .filter((d) => isDue(d.next_review_at, today))
    .sort((a, b) => a.mastery - b.mastery || (a.word < b.word ? -1 : 1))
    .map((d) => ({ word: d.word, mastery: d.mastery, nextReviewAt: d.next_review_at }));

  // Per-slug accuracy, worst first (mistake signal).
  const bySlug = new Map<string, { skill: string; slug: string; score: number; total: number; attempts: number }>();
  for (const r of skillRows) {
    const key = `${r.skill}::${r.slug}`;
    const g = bySlug.get(key) ?? { skill: r.skill, slug: r.slug, score: 0, total: 0, attempts: 0 };
    g.score += Math.max(0, r.score);
    g.total += r.total;
    g.attempts += 1;
    bySlug.set(key, g);
  }
  const worstSlugs: SlugStat[] = Array.from(bySlug.values())
    .filter((g) => g.total > 0)
    .map((g) => ({
      skill: g.skill,
      slug: g.slug,
      title: slugTitle(g.skill, g.slug),
      accuracyPct: Math.round((g.score / g.total) * 100),
      attempts: g.attempts,
    }))
    .sort((a, b) => a.accuracyPct - b.accuracyPct || b.attempts - a.attempts || (a.slug < b.slug ? -1 : 1));

  // Recurring writing error categories.
  const errCounts = new Map<string, number>();
  for (const e of ((errRes.data ?? []) as Array<{ category: string }>)) {
    if (typeof e.category === "string" && e.category.length > 0) errCounts.set(e.category, (errCounts.get(e.category) ?? 0) + 1);
  }
  const writingErrors: WritingErrorCount[] = Array.from(errCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || (a.category < b.category ? -1 : 1))
    .slice(0, 3);

  // Most-missed spelling words.
  const missCounts = new Map<string, number>();
  for (const s of spells) {
    if (!s.correct && typeof s.word === "string" && s.word.length > 0) {
      missCounts.set(s.word, (missCounts.get(s.word) ?? 0) + 1);
    }
  }
  const misspelledWords: MissedWord[] = Array.from(missCounts.entries())
    .map(([word, misses]) => ({ word, misses }))
    .sort((a, b) => b.misses - a.misses || (a.word < b.word ? -1 : 1))
    .slice(0, 5);

  // Learning history: recent modules + slugs (variety / no-repeat signals).
  const acts = ((actRes.data ?? []) as Array<{ kind: string; created_at: string }>);
  const recentKinds = Array.from(new Set(acts.filter((a) => (a.created_at ?? "") >= weekAgoIso).map((a) => a.kind)));
  const recentSlugs = Array.from(new Set(skillRows.filter((r) => (r.created_at ?? "") >= weekAgoIso).map((r) => r.slug)));

  // Productive recency.
  const lastWrite = writes[0]?.created_at ?? null;
  const lastSpeak = speaks[0]?.created_at ?? null;
  const writingDaysAgo = lastWrite ? daysBetween(lastWrite, now) : null;
  const speakingDaysAgo = lastSpeak ? daysBetween(lastSpeak, now) : null;

  const xpEvents = ((xpRes.data ?? []) as Array<{ amount: number; created_at: string }>);
  const xpToday = xpEvents
    .filter((e) => dateKeyInTimezone(new Date(e.created_at ?? ""), timezone) === today)
    .reduce((s, e) => s + (e.amount || 0), 0);

  const input: SmartPathInput = {
    level,
    learningMode: (p.learning_mode ?? null) as LearningMode | null,
    goals: Array.isArray(p.goals) ? p.goals : [],
    todayKey: today,
    skills,
    weakAreas,
    dueWords,
    totalWords: dictEntries.length,
    avgMastery,
    worstSlugs,
    writingErrors,
    misspelledWords,
    recentKinds,
    recentSlugs,
    challengeDone: Boolean(chalRes.data),
    xpToday,
    dailyGoalXp: p.daily_goal_xp ?? 30,
    streak: p.current_streak ?? 0,
    writingDaysAgo,
    speakingDaysAgo,
  };

  const plan = buildSmartPath(input);

  return NextResponse.json({
    configured: true,
    signedIn: true,
    preview: false,
    ...plan,
    signals: {
      weakAreas,
      dueCount: dueWords.length,
      totalWords: dictEntries.length,
      avgMastery,
      writingErrors,
      misspelledWords: misspelledWords.slice(0, 3),
      recentKinds,
    },
    reviewQueue: dueWords.slice(0, 8),
  });
}
