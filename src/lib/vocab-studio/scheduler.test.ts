import { describe, expect, it } from "vitest";
import { rateCard, isMastered, xpForRating, isCardDue, normalizeRating } from "./scheduler";

const base = { status: "new" as const, mastery: 0, easeFactor: 2.5, intervalDays: 0, reviewCount: 0, correctCount: 0, lapses: 0 };

describe("vocab-studio scheduler (FSRS-lite, documented)", () => {
  it("again resets interval, drops mastery, counts a lapse", () => {
    const r = rateCard({ ...base, mastery: 60, intervalDays: 7, status: "review", reviewCount: 5, correctCount: 4 }, "again", new Date("2026-01-01T00:00:00Z"));
    expect(r.correct).toBe(false);
    expect(r.mastery).toBe(40);
    expect(r.intervalDays).toBe(0);
    expect(r.nextReviewAt).toBe("2026-01-02");
    expect(r.lapses).toBe(1);
    expect(r.status).toBe("relearning");
  });

  it("good progresses 1→3→7 and promotes new→learning→review", () => {
    const s1 = rateCard(base, "good", new Date("2026-01-01T00:00:00Z"));
    expect(s1.intervalDays).toBe(1);
    expect(s1.status).toBe("learning");
    const s2 = rateCard(s1, "good", new Date("2026-01-02T00:00:00Z"));
    expect(s2.intervalDays).toBe(3);
    expect(s2.status).toBe("review");
  });

  it("easy boosts ease and interval", () => {
    const r = rateCard({ ...base, intervalDays: 3, status: "learning", reviewCount: 1 }, "easy");
    expect(r.mastery).toBe(25);
    expect(r.easeFactor).toBeGreaterThan(2.5);
    expect(r.intervalDays).toBeGreaterThanOrEqual(2);
  });

  it("hard is gentler than good but still correct", () => {
    const h = rateCard(base, "hard");
    const g = rateCard(base, "good");
    expect(h.correct).toBe(true);
    expect(h.mastery).toBeLessThan(g.mastery);
  });

  it("mastery requires 80+ mastery, 3+ reviews, 75%+ accuracy — views never count", () => {
    expect(isMastered({ mastery: 100, reviewCount: 0, correctCount: 0 })).toBe(false);
    expect(isMastered({ mastery: 90, reviewCount: 4, correctCount: 2 })).toBe(false);
    expect(isMastered({ mastery: 85, reviewCount: 4, correctCount: 3 })).toBe(true);
  });

  it("legacy known/unknown map to good/again; XP matches legacy reviewXp", () => {
    expect(normalizeRating("known")).toBe("good");
    expect(normalizeRating("unknown")).toBe("again");
    expect(xpForRating("unknown")).toBe(1);
    expect(xpForRating("known")).toBe(3);
  });

  it("due check is timezone-safe via caller date key", () => {
    expect(isCardDue(null, "2026-10-13")).toBe(true);
    expect(isCardDue("2026-10-13", "2026-10-13")).toBe(true);
    expect(isCardDue("2026-10-14", "2026-10-13")).toBe(false);
    expect(isCardDue("2026-10-12", "2026-10-13")).toBe(true);
  });
});
