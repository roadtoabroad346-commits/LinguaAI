/**
 * Phase 7 (compliance) — single source of truth for ALL XP values.
 * No module may hard-code XP numbers; import from here instead.
 *
 * THE ECONOMY (why these numbers are logical):
 * - Daily goal default is 30 XP. One focused session earns it:
 *   Daily Challenge (5 × 10 + 10 perfect bonus = up to 60 XP) alone clears it;
 *   or any two smaller modules (e.g. spelling 5×5+10=35 XP).
 * - Graded sets (5 questions): per-correct XP × difficulty weight + perfect bonus.
 *   Weights: vocabulary/spelling/grammar 5 XP (fast, forgiving), reading/listening
 *   8 XP (longer, harder), daily challenge 10 XP (once a day, streak-guarding).
 * - Productive skills (writing/speaking/read-aloud) use score BANDS, not raw
 *   points, so a brave A1 attempt still earns 8 XP while a C1-perfect 95+
 *   earns 22 XP. Effort is always rewarded; excellence earns ~3× more.
 * - Level thresholds are spaced so a 30-XP/day learner levels up roughly
 *   every 1–4 weeks early, then every 2–3 months late (long-term retention).
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

/**
 * Honest AI guard for productive skills: blend an AI-judged 0–100 score 50/50
 * with the deterministic rule score, so a generous model cannot inflate a weak
 * text (or crush a clean one). Single place where the blend lives.
 */
export function blendAiScore(ruleScore: number, aiScore: number): number {
  return Math.round(aiScore * 0.5 + ruleScore * 0.5);
}
