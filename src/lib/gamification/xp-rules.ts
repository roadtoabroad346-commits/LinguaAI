/**
 * Phase 7 (compliance) — single source of truth for ALL XP values.
 * No module may hard-code XP numbers; import from here instead.
 * Values match the original per-module rules so behavior is unchanged.
 */
export const XP_RULES = {
  spelling: { perCorrect: 5, bonus: 10 },
  vocabPractice: { perCorrect: 5, bonus: 10 },
  dailyChallenge: { perCorrect: 10, bonus: 10 },
  grammar: { perCorrect: 5, bonus: 10 },
  reading: { perCorrect: 8, bonus: 10 },
  listening: { perCorrect: 8, bonus: 10 },
  /** Score-band XP shared by speaking, read-aloud and writing. */
  bands: {
    productive: [
      { min: 0, xp: 8 },
      { min: 40, xp: 12 },
      { min: 70, xp: 17 },
      { min: 85, xp: 22 },
    ],
  },
  /** Consolation award so a zero-score Daily Challenge attempt still counts toward the streak. */
  challengeAttempt: 1,
  /** Exact-match dictation award. */
  dictation: { exactXp: 5 },
} as const;

export interface XpBand {
  min: number;
  xp: number;
}

/** XP for a 0–100 score against a band table (first band whose min <= score wins, checked top-down). */
export function xpFromBands(bands: readonly XpBand[], score: number): number {
  let xp = bands[0]?.xp ?? 0;
  for (const b of bands) {
    if (score >= b.min) xp = b.xp;
  }
  return xp;
}

/** Standard graded-set math: per-correct XP plus a perfect bonus. Single place where the formula lives. */
export function xpForGradedSet(perCorrect: number, bonus: number, score: number, total: number): number {
  const perfect = total > 0 && score === total;
  return score * perCorrect + (perfect ? bonus : 0);
}
