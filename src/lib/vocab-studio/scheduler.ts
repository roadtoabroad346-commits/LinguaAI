/**
 * Flashcards Pro scheduler — FSRS-lite / SM-2-lite hybrid.
 *
 * DOCUMENTED ALGORITHM (not claimed as scientifically validated):
 * - State per card: status (new|learning|review|relearning|mastered),
 *   mastery 0–100, ease_factor 1.3–3.0, interval_days, review_count,
 *   correct_count, lapses, next_review_at, last_reviewed_at.
 * - Ratings: again (forgot), hard, good, easy. Legacy booleans map:
 *   known=true → good, known=false → again.
 * - again: mastery −20 (min 0), ease −0.2 (min 1.3), interval → 0 (review
 *   tomorrow), status → relearning (or learning if it was new), lapses +1.
 * - hard: mastery +8, ease −0.05, interval = max(1, round(prev*1.2)) for
 *   review cards, else 1 day. Status → learning unless mastery ≥ 80.
 * - good: mastery +15, ease unchanged, interval progression 1→3→7→×ease
 *   (capped 180d). New→learning→review.
 * - easy: mastery +25, ease +0.1 (max 3.0), interval = max(2, round(prev*ease*1.3)).
 * - mastered ⇔ mastery ≥ 80 AND review_count ≥ 3 AND accuracy ≥ 75%.
 *   Viewing a card NEVER marks it mastered — only graded reviews do.
 * - Timezones: next_review_at is a UTC YYYY-MM-DD date key; "due today"
 *   compares with the caller's local date key (passed in, never assumed).
 * - Idempotency is enforced at the API layer via vocab_reviews.idempotency_key.
 *
 * Reuses legacy curves from src/lib/vocab/mastery.ts where compatible
 * (reviewIntervalDays / bands) so old dictionary_entries behaviour is preserved.
 */

export type RecallRating = "again" | "hard" | "good" | "easy" | "known" | "unknown";
export type CardStatus = "new" | "learning" | "review" | "relearning" | "mastered";

export interface SchedState {
  status: CardStatus;
  mastery: number;
  easeFactor: number;
  intervalDays: number;
  reviewCount: number;
  correctCount: number;
  lapses: number;
}

export interface SchedResult extends SchedState {
  correct: boolean;
  nextReviewAt: string; // YYYY-MM-DD UTC
}

export function normalizeRating(r: RecallRating): "again" | "hard" | "good" | "easy" {
  if (r === "known") return "good";
  if (r === "unknown") return "again";
  return r;
}

function clampMastery(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function clampEase(n: number): number {
  return Math.max(1.3, Math.min(3.0, Math.round(n * 100) / 100));
}
function datePlusDays(from: Date, days: number): string {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

/** Mastery criteria — explicit, never inferred from views. */
export function isMastered(s: Pick<SchedState, "mastery" | "reviewCount" | "correctCount">): boolean {
  if (s.mastery < 80) return false;
  if (s.reviewCount < 3) return false;
  if (s.reviewCount <= 0) return false;
  return s.correctCount / s.reviewCount >= 0.75;
}

export function statusAfter(s: SchedState): CardStatus {
  if (isMastered(s)) return "mastered";
  return s.status;
}

export function rateCard(prev: SchedState, rating: RecallRating, from = new Date()): SchedResult {
  const r = normalizeRating(rating);
  const correct = r !== "again";
  let mastery = clampMastery(prev.mastery);
  let ease = clampEase(prev.easeFactor || 2.5);
  let interval = Math.max(0, Math.round(prev.intervalDays || 0));
  let status: CardStatus = prev.status || "new";
  let lapses = Math.max(0, prev.lapses || 0);
  const reviewCount = (prev.reviewCount || 0) + 1;
  const correctCount = (prev.correctCount || 0) + (correct ? 1 : 0);

  if (r === "again") {
    mastery = clampMastery(mastery - 20);
    ease = clampEase(ease - 0.2);
    interval = 0; // due tomorrow
    lapses += 1;
    status = prev.status === "new" ? "learning" : "relearning";
  } else if (r === "hard") {
    mastery = clampMastery(mastery + 8);
    ease = clampEase(ease - 0.05);
    interval = status === "review" || status === "relearning" ? Math.max(1, Math.round(Math.max(1, interval) * 1.2)) : 1;
    if (mastery >= 80 && reviewCount >= 3) status = "review";
    else if (status === "new") status = "learning";
  } else if (r === "good") {
    mastery = clampMastery(mastery + 15);
    if (interval <= 0) interval = 1;
    else if (interval === 1) interval = 3;
    else if (interval < 7) interval = 7;
    else interval = Math.min(180, Math.round(interval * ease));
    if (status === "new" || status === "learning") status = reviewCount >= 2 ? "review" : "learning";
    if (status === "relearning" && mastery >= 40) status = "review";
  } else {
    // easy
    mastery = clampMastery(mastery + 25);
    ease = clampEase(ease + 0.1);
    interval = Math.max(2, Math.round(Math.max(1, interval) * ease * 1.3));
    if (status === "new" || status === "learning" || status === "relearning") status = "review";
  }

  const next: SchedState = { status, mastery, easeFactor: ease, intervalDays: interval, reviewCount, correctCount, lapses };
  next.status = statusAfter(next);
  const nextReviewAt = datePlusDays(from, interval <= 0 ? 1 : interval);
  return { ...next, correct, nextReviewAt };
}

/** XP per rating: again 1, hard 2, good 3, easy 4 (matches legacy reviewXp for known/unknown). */
export function xpForRating(rating: RecallRating): number {
  const r = normalizeRating(rating);
  if (r === "again") return 1;
  if (r === "hard") return 2;
  if (r === "good") return 3;
  return 4;
}

/** Due check against a caller-provided YYYY-MM-DD key (timezone-safe). */
export function isCardDue(nextReviewAt: string | null | undefined, todayKey: string): boolean {
  if (!nextReviewAt) return true;
  return nextReviewAt <= todayKey;
}
