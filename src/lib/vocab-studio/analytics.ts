/** Flashcards Pro — analytics over persisted rows. Pure functions, no I/O. */

export interface StudioCardRow {
  id: string;
  set_id: string;
  mastery: number;
  status: string;
  review_count: number;
  correct_count: number;
  lapses: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
}

export interface StudioReviewRow {
  card_id: string;
  correct: boolean;
  created_at: string;
}

export interface StudioStats {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  masteredCards: number;
  dueToday: number;
  overdue: number;
  avgMastery: number | null;
  accuracy7d: number | null;
  correct7d: number;
  incorrect7d: number;
  reviews7d: number;
  weeklyActivity: Array<{ day: string; reviews: number; correct: number }>;
  difficultWords: Array<{ cardId: string; lapses: number; mastery: number }>;
  bySet: Array<{ setId: string; total: number; due: number; mastered: number; avgMastery: number | null }>;
}

/** Mastery criteria (explicit): mastery>=80, review_count>=3, accuracy>=75%. */
export function isMasteredRow(c: Pick<StudioCardRow, "mastery" | "review_count" | "correct_count">): boolean {
  if (c.mastery < 80 || c.review_count < 3) return false;
  return c.correct_count / Math.max(1, c.review_count) >= 0.75;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeStudioStats(
  cards: StudioCardRow[],
  reviews: StudioReviewRow[],
  todayKey: string,
  setIds?: string[]
): StudioStats {
  const totalCards = cards.length;
  const newCards = cards.filter((c) => c.status === "new").length;
  const learningCards = cards.filter((c) => c.status === "learning" || c.status === "relearning").length;
  const reviewCards = cards.filter((c) => c.status === "review").length;
  const masteredCards = cards.filter(isMasteredRow).length;
  const dueToday = cards.filter((c) => !c.next_review_at || c.next_review_at <= todayKey).length;
  const overdue = cards.filter((c) => c.next_review_at && c.next_review_at < todayKey).length;
  const avgMastery = totalCards > 0
    ? Math.round(cards.reduce((s, c) => s + (c.mastery || 0), 0) / totalCards)
    : null;

  const cutoff = new Date(`${todayKey}T00:00:00Z`).getTime() - 6 * 86_400_000;
  const recent = reviews.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  const correct7d = recent.filter((r) => r.correct).length;
  const incorrect7d = recent.length - correct7d;
  const accuracy7d = recent.length > 0 ? Math.round((correct7d / recent.length) * 100) : null;

  const weeklyActivity: StudioStats["weeklyActivity"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(`${todayKey}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    const dayReviews = recent.filter((r) => (r.created_at ?? "").slice(0, 10) === key);
    weeklyActivity.push({
      day: key,
      reviews: dayReviews.length,
      correct: dayReviews.filter((r) => r.correct).length,
    });
  }

  const difficultWords = [...cards]
    .filter((c) => c.lapses > 0 || (c.review_count >= 2 && c.mastery < 40))
    .sort((a, b) => b.lapses - a.lapses || a.mastery - b.mastery)
    .slice(0, 20)
    .map((c) => ({ cardId: c.id, lapses: c.lapses, mastery: c.mastery }));

  const ids = setIds ?? Array.from(new Set(cards.map((c) => c.set_id)));
  const bySet = ids.map((setId) => {
    const sc = cards.filter((c) => c.set_id === setId);
    return {
      setId,
      total: sc.length,
      due: sc.filter((c) => !c.next_review_at || c.next_review_at <= todayKey).length,
      mastered: sc.filter(isMasteredRow).length,
      avgMastery: sc.length > 0 ? Math.round(sc.reduce((s, c) => s + (c.mastery || 0), 0) / sc.length) : null,
    };
  });

  return {
    totalCards, newCards, learningCards, reviewCards, masteredCards,
    dueToday, overdue, avgMastery, accuracy7d, correct7d, incorrect7d,
    reviews7d: recent.length, weeklyActivity, difficultWords, bySet,
  };
}
