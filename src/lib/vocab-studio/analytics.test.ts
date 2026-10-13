import { describe, expect, it } from "vitest";
import { computeStudioStats, isMasteredRow } from "./analytics";
import { createSetSchema, cardSchema, reviewSubmitSchema, bulkImportSchema } from "./schemas";

describe("vocab-studio analytics", () => {
  it("computes real stats from rows (no fabrication)", () => {
    const cards = [
      { id: "a", set_id: "s1", mastery: 90, status: "review", review_count: 4, correct_count: 4, lapses: 0, next_review_at: "2026-10-12", last_reviewed_at: null, created_at: "2026-10-01T00:00:00Z" },
      { id: "b", set_id: "s1", mastery: 10, status: "new", review_count: 0, correct_count: 0, lapses: 0, next_review_at: null, last_reviewed_at: null, created_at: "2026-10-13T00:00:00Z" },
      { id: "c", set_id: "s2", mastery: 30, status: "learning", review_count: 3, correct_count: 1, lapses: 2, next_review_at: "2026-10-13", last_reviewed_at: null, created_at: "2026-10-10T00:00:00Z" },
    ];
    const reviews = [
      { card_id: "a", correct: true, created_at: "2026-10-13T10:00:00Z" },
      { card_id: "c", correct: false, created_at: "2026-10-12T10:00:00Z" },
    ];
    const s = computeStudioStats(cards, reviews, "2026-10-13");
    expect(s.totalCards).toBe(3);
    expect(s.newCards).toBe(1);
    expect(s.masteredCards).toBe(1);
    expect(s.dueToday).toBe(3);
    expect(s.overdue).toBe(1);
    expect(s.accuracy7d).toBe(50);
    expect(s.weeklyActivity.length).toBe(7);
    expect(s.bySet.length).toBe(2);
    expect(s.difficultWords[0].cardId).toBe("c");
  });

  it("empty library yields nulls, not zeros-as-facts", () => {
    const s = computeStudioStats([], [], "2026-10-13");
    expect(s.totalCards).toBe(0);
    expect(s.avgMastery).toBeNull();
    expect(s.accuracy7d).toBeNull();
  });

  it("mastery criteria are explicit", () => {
    expect(isMasteredRow({ mastery: 100, review_count: 2, correct_count: 2 })).toBe(false);
    expect(isMasteredRow({ mastery: 80, review_count: 4, correct_count: 3 })).toBe(true);
  });
});

describe("vocab-studio schemas", () => {
  it("rejects empty titles and empty cards", () => {
    expect(createSetSchema.safeParse({ title: "" }).success).toBe(false);
    expect(cardSchema.safeParse({ front: "", back: "", word: "" }).success).toBe(false);
    expect(cardSchema.safeParse({ front: "hi", back: "привет", word: "hi" }).success).toBe(true);
  });

  it("review requires uuid + idempotency key", () => {
    expect(reviewSubmitSchema.safeParse({ cardId: "nope", rating: "good", idempotencyKey: "x" }).success).toBe(false);
    expect(reviewSubmitSchema.safeParse({
      cardId: "123e4567-e89b-12d3-a456-426614174000", rating: "easy", idempotencyKey: "123e4567-e89b-12d3-a456-426614174001",
    }).success).toBe(true);
  });

  it("bulk import caps at 500 rows", () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ front: `w${i}`, back: "b", word: `w${i}` }));
    expect(bulkImportSchema.safeParse({ mode: "skip", rows }).success).toBe(false);
  });
});
