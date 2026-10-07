/** Phase 3 — mastery model. Pure functions, no I/O. Mastery is 0–100. */

export type MasteryBand = "new" | "learning" | "familiar" | "mastered";

export function masteryBand(mastery: number): MasteryBand {
  if (mastery <= 0) return "new";
  if (mastery < 40) return "learning";
  if (mastery < 80) return "familiar";
  return "mastered";
}

export const BAND_LABEL: Record<MasteryBand, string> = {
  new: "New",
  learning: "Learning",
  familiar: "Familiar",
  mastered: "Mastered",
};

/** SM-2-lite: a correct review adds +20, a miss subtracts 15 (floored at 0). */
export function applyReview(mastery: number, known: boolean): number {
  const m = Math.max(0, Math.min(100, Math.round(mastery)));
  return known ? Math.min(100, m + 20) : Math.max(0, m - 15);
}

/** Practice quiz is gentler than flashcards: +10 per correct, −5 per miss. */
export function applyPracticeResult(mastery: number, correct: boolean): number {
  const m = Math.max(0, Math.min(100, Math.round(mastery)));
  return correct ? Math.min(100, m + 10) : Math.max(0, m - 5);
}

/** Spaced-repetition interval in days, derived from mastery. */
export function reviewIntervalDays(mastery: number): number {
  if (mastery < 20) return 1;
  if (mastery < 40) return 2;
  if (mastery < 60) return 4;
  if (mastery < 80) return 7;
  return 14;
}

/** Next review date (YYYY-MM-DD) from a reference date. */
export function nextReviewDate(mastery: number, from = new Date()): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + reviewIntervalDays(mastery));
  return d.toISOString().slice(0, 10);
}

/** True when a stored next_review_at (YYYY-MM-DD) is due on/before today. */
export function isDue(nextReviewAt: string | null, todayKey: string): boolean {
  if (!nextReviewAt) return true;
  return nextReviewAt <= todayKey;
}

/** XP for a flashcard review: known earns more, attempts always earn something. */
export function reviewXp(known: boolean): number {
  return known ? 3 : 1;
}
