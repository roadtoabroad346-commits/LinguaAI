/** Phase 7 — gamification: XP levels, achievements, daily-goal helpers. Pure + deterministic. */

export interface XpLevel {
  index: number;
  name: string;
  min: number;
  nextMin: number | null;
}

const LEVEL_STEPS: Array<{ name: string; min: number }> = [
  { name: "Novice", min: 0 },
  { name: "Explorer", min: 100 },
  { name: "Builder", min: 300 },
  { name: "Achiever", min: 600 },
  { name: "Pathfinder", min: 1000 },
  // Late-game milestones: a 30-XP/day learner reaches Scholar in ~2 months,
  // Grandmaster in ~4–5 months and Legend in ~7 months of daily practice.
  { name: "Scholar", min: 1600 },
  { name: "Master", min: 2500 },
  { name: "Grandmaster", min: 4000 },
  { name: "Legend", min: 6000 },
];

/** XP level for a lifetime total. Progress is 0–100 toward the next level. */
export function getXpLevel(totalXp: number): XpLevel & { progressPct: number } {
  const total = Math.max(0, Math.floor(totalXp));
  let idx = 0;
  for (let i = 0; i < LEVEL_STEPS.length; i++) {
    if (total >= LEVEL_STEPS[i].min) idx = i;
  }
  const current = LEVEL_STEPS[idx];
  const next = LEVEL_STEPS[idx + 1] ?? null;
  const progressPct = next ? Math.min(100, Math.round(((total - current.min) / (next.min - current.min)) * 100)) : 100;
  return { index: idx, name: current.name, min: current.min, nextMin: next?.min ?? null, progressPct };
}

export interface GamStats {
  totalXp: number;
  streakCurrent: number;
  longestStreak: number;
  challengeCompletions: number;
  challengePerfect: number;
  spellingCorrect: number;
  spellingPerfectSessions: number;
  dictionaryCount: number;
  /** Distinct quiz skills with at least one graded attempt (grammar/reading/…). */
  skillsTried?: number;
  /** Skills with ≥80% accuracy over ≥2 attempts. */
  skillsStrong?: number;
  /** Best productive scores 0–100 (null-safe: 0 when no attempts yet). */
  writingTop?: number;
  speakingTop?: number;
  readAloudTop?: number;
}

export interface AchievementDef {
  key: string;
  title: string;
  description: string;
  check: (s: GamStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first-steps", title: "First Steps", description: "Earn 10 XP.", check: (s) => s.totalXp >= 10 },
  { key: "warm-up", title: "Warm-Up", description: "Complete a Daily Challenge.", check: (s) => s.challengeCompletions >= 1 },
  { key: "perfect-day", title: "Perfect Day", description: "Score 100% on a Daily Challenge.", check: (s) => s.challengePerfect >= 1 },
  { key: "streak-3", title: "3-Day Streak", description: "Practice 3 days in a row.", check: (s) => s.longestStreak >= 3 || s.streakCurrent >= 3 },
  { key: "streak-7", title: "Week Warrior", description: "Practice 7 days in a row.", check: (s) => s.longestStreak >= 7 || s.streakCurrent >= 7 },
  { key: "streak-14", title: "Fortnight Focus", description: "Practice 14 days in a row.", check: (s) => s.longestStreak >= 14 || s.streakCurrent >= 14 },
  { key: "streak-30", title: "Monthly Master", description: "Practice 30 days in a row.", check: (s) => s.longestStreak >= 30 || s.streakCurrent >= 30 },
  { key: "streak-60", title: "Two-Month Flame", description: "Practice 60 days in a row.", check: (s) => s.longestStreak >= 60 || s.streakCurrent >= 60 },
  { key: "streak-100", title: "Century of Fire", description: "Practice 100 days in a row.", check: (s) => s.longestStreak >= 100 || s.streakCurrent >= 100 },
  { key: "xp-100", title: "Century Club", description: "Reach 100 total XP.", check: (s) => s.totalXp >= 100 },
  { key: "xp-250", title: "Rising Star", description: "Reach 250 total XP.", check: (s) => s.totalXp >= 250 },
  { key: "xp-500", title: "High Five Hundred", description: "Reach 500 total XP.", check: (s) => s.totalXp >= 500 },
  { key: "xp-1000", title: "XP Thousand", description: "Reach 1,000 total XP.", check: (s) => s.totalXp >= 1000 },
  { key: "xp-2500", title: "Overachiever", description: "Reach 2,500 total XP.", check: (s) => s.totalXp >= 2500 },
  { key: "xp-5000", title: "XP Legend", description: "Reach 5,000 total XP.", check: (s) => s.totalXp >= 5000 },
  { key: "xp-10000", title: "Immortal", description: "Reach 10,000 total XP.", check: (s) => s.totalXp >= 10000 },
  { key: "word-collector-10", title: "Word Collector", description: "Save 10 words to your dictionary.", check: (s) => s.dictionaryCount >= 10 },
  { key: "word-collector-50", title: "Word Hoarder", description: "Save 50 words to your dictionary.", check: (s) => s.dictionaryCount >= 50 },
  { key: "word-collector-100", title: "Librarian", description: "Save 100 words to your dictionary.", check: (s) => s.dictionaryCount >= 100 },
  { key: "word-collector-200", title: "Walking Dictionary", description: "Save 200 words to your dictionary.", check: (s) => s.dictionaryCount >= 200 },
  { key: "spelling-bee", title: "Spelling Bee", description: "Score 100% on a spelling session.", check: (s) => s.spellingPerfectSessions >= 1 },
  { key: "spelling-grinder", title: "Spelling Grinder", description: "Spell 50 words correctly.", check: (s) => s.spellingCorrect >= 50 },
  { key: "spelling-master", title: "Spelling Master", description: "Spell 200 words correctly.", check: (s) => s.spellingCorrect >= 200 },
  { key: "perfectionist", title: "Perfectionist", description: "Score 100% on 5 Daily Challenges.", check: (s) => s.challengePerfect >= 5 },
  { key: "habit-builder", title: "Habit Builder", description: "Complete 30 Daily Challenges.", check: (s) => s.challengeCompletions >= 30 },
  { key: "skill-explorer", title: "Skill Explorer", description: "Try 5 different skills.", check: (s) => (s.skillsTried ?? 0) >= 5 },
  { key: "triple-star", title: "Triple Star", description: "Reach 80%+ accuracy in 3 skills.", check: (s) => (s.skillsStrong ?? 0) >= 3 },
  { key: "grand-scholar", title: "Grand Scholar", description: "Reach 80%+ accuracy in 5 skills.", check: (s) => (s.skillsStrong ?? 0) >= 5 },
  { key: "wordsmith", title: "Wordsmith", description: "Score 85+ on a writing task.", check: (s) => (s.writingTop ?? 0) >= 85 },
  { key: "confident-speaker", title: "Confident Speaker", description: "Score 85+ on a speaking topic.", check: (s) => (s.speakingTop ?? 0) >= 85 },
  { key: "clear-voice", title: "Clear Voice", description: "Reach 90%+ read-aloud accuracy.", check: (s) => (s.readAloudTop ?? 0) >= 90 },
];

/** Keys of newly earned achievements given stats + already unlocked keys. */
export function evaluateAchievements(stats: GamStats, unlockedKeys: string[] = []): string[] {
  const owned = new Set(unlockedKeys);
  return ACHIEVEMENTS.filter((a) => !owned.has(a.key) && a.check(stats)).map((a) => a.key);
}

export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50, 80, 100, 150, 200] as const;

export function isValidDailyGoal(v: number): boolean {
  return Number.isInteger(v) && v >= 10 && v <= 200;
}

/** Daily-goal progress 0–100. */
export function goalProgressPct(xpToday: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.max(0, xpToday) / goal) * 100)));
}

/* ------------------------------------------------------------------ */
/* Skill scores + weak areas (Phase 7 compliance, pure + deterministic) */
/* ------------------------------------------------------------------ */

export interface SkillAttemptLike {
  skill: string;
  score: number;
  total: number;
}

export interface SkillScore {
  skill: string;
  label: string;
  attempts: number;
  /** 0–100, or null when there is no data yet. */
  accuracyPct: number | null;
  href: string;
  /** Explains what the number means (accuracy vs avg mastery). */
  note: string;
}

export const SKILL_META: Record<string, { label: string; href: string }> = {
  vocabulary: { label: "Vocabulary", href: "/vocabulary" },
  grammar: { label: "Grammar", href: "/grammar" },
  reading: { label: "Reading", href: "/reading" },
  listening: { label: "Listening", href: "/listening" },
  pronunciation: { label: "Pronunciation", href: "/pronunciation" },
  dictation: { label: "Dictation", href: "/listening" },
  spelling: { label: "Spelling", href: "/spelling" },
  writing: { label: "Writing", href: "/writing" },
  speaking: { label: "Speaking", href: "/speaking" },
  "read-aloud": { label: "Read Aloud", href: "/speaking" },
};

export const SKILL_ORDER = ["vocabulary", "grammar", "reading", "listening", "pronunciation", "dictation", "spelling", "writing", "speaking", "read-aloud"];

/**
 * Aggregate {skill, score, total} rows into per-skill accuracy.
 * `vocabularyMastery` (0–100 avg from dictionary entries) seeds the
 * vocabulary row; `vocabularyCount` is its attempt count (saved words).
 */
export function computeSkillScores(
  rows: SkillAttemptLike[],
  vocabularyMastery: { avg: number | null; count: number } = { avg: null, count: 0 }
): SkillScore[] {
  const bySkill = new Map<string, { score: number; total: number; attempts: number }>();
  for (const r of rows) {
    const skill = r.skill.trim().toLowerCase();
    if (!SKILL_META[skill]) continue;
    if (!Number.isFinite(r.score) || !Number.isFinite(r.total) || r.total <= 0) continue;
    const g = bySkill.get(skill) ?? { score: 0, total: 0, attempts: 0 };
    g.score += Math.max(0, r.score);
    g.total += r.total;
    g.attempts += 1;
    bySkill.set(skill, g);
  }
  return SKILL_ORDER.map((skill) => {
    const meta = SKILL_META[skill];
    if (skill === "vocabulary") {
      return {
        skill,
        label: meta.label,
        attempts: vocabularyMastery.count,
        accuracyPct: vocabularyMastery.avg,
        href: meta.href,
        note: "avg mastery",
      };
    }
    const g = bySkill.get(skill);
    return {
      skill,
      label: meta.label,
      attempts: g?.attempts ?? 0,
      accuracyPct: g && g.total > 0 ? Math.round((g.score / g.total) * 100) : null,
      href: meta.href,
      note: "accuracy",
    };
  });
}

/** Accuracy over boolean spelling-style attempts. */
export function spellingAccuracy(attempts: Array<{ correct: boolean }>): { attempts: number; accuracyPct: number | null } {
  if (attempts.length === 0) return { attempts: 0, accuracyPct: null };
  const correct = attempts.filter((a) => a.correct).length;
  return { attempts: attempts.length, accuracyPct: Math.round((correct / attempts.length) * 100) };
}

export interface MasteryStats {
  count: number;
  avg: number | null;
  distribution: { fresh: number; learning: number; good: number; mastered: number };
}

/** Vocabulary mastery distribution from dictionary entries (mastery 0–100). */
export function masteryStats(entries: Array<{ mastery: number }>): MasteryStats {
  const dist = { fresh: 0, learning: 0, good: 0, mastered: 0 };
  let sum = 0;
  let n = 0;
  for (const e of entries) {
    if (!Number.isFinite(e.mastery)) continue;
    n += 1;
    sum += Math.max(0, Math.min(100, e.mastery));
    if (e.mastery < 20) dist.fresh += 1;
    else if (e.mastery < 60) dist.learning += 1;
    else if (e.mastery < 85) dist.good += 1;
    else dist.mastered += 1;
  }
  return { count: n, avg: n > 0 ? Math.round(sum / n) : null, distribution: dist };
}

export interface WeakArea {
  skill: string;
  label: string;
  reason: string;
  href: string;
}

const WEAK_ACCURACY = 70;

/** Up to `max` weak areas: low accuracy first, then unstarted skills. */
export function findWeakAreas(skills: SkillScore[], max = 3): WeakArea[] {
  const weak = skills
    .filter((s) => s.accuracyPct !== null && (s.accuracyPct as number) < WEAK_ACCURACY)
    .sort((a, b) => (a.accuracyPct as number) - (b.accuracyPct as number))
    .map((s) => ({ skill: s.skill, label: s.label, reason: `${s.accuracyPct}% ${s.note} — needs work`, href: s.href }));
  const unstarted = skills
    .filter((s) => s.accuracyPct === null)
    .map((s) => ({ skill: s.skill, label: s.label, reason: "Not started yet", href: s.href }));
  return [...weak, ...unstarted].slice(0, Math.max(1, max));
}
