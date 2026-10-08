import { describe, expect, it } from "vitest";
import { VOCAB_BANK, getWord, searchWords, relatedWords, countByLevel, wordTopic, listTopics } from "./bank";
import { masteryBand, applyReview, applyPracticeResult, reviewIntervalDays, nextReviewDate, isDue, reviewXp } from "./mastery";
import { buildPracticeSet, toPublicPracticeSet, gradePracticeSet, gradePracticeByWord } from "./practice";

describe("vocab bank", () => {
  it("has 100 unique words, 20 per level", () => {
    expect(VOCAB_BANK).toHaveLength(100);
    expect(new Set(VOCAB_BANK.map((w) => w.slug)).size).toBe(100);
    expect(countByLevel()).toEqual({ A1: 20, A2: 20, B1: 20, B2: 20, C1: 20 });
  });
  it("looks up case-insensitively and rejects unknown", () => {
    expect(getWord("Bright")?.definition).toContain("light");
    expect(getWord("  OPPORTUNITY ")?.level).toBe("B1");
    expect(getWord("xyzzy")).toBeNull();
  });
  it("searches across word/definition/example", () => {
    expect(searchWords({ q: "journey" }).map((w) => w.slug)).toEqual(["journey", "itinerary"]);
    expect(searchWords({ q: "trust" })[0].word).toBe("reliable");
    expect(searchWords({ level: "A1" })).toHaveLength(20);
    expect(searchWords({ level: "B2", pos: "verb" }).every((w) => w.level === "B2" && w.partOfSpeech === "verb")).toBe(true);
    expect(searchWords({ q: "no-such-word-xyz" })).toHaveLength(0);
  });
  it("tags every word with a topic and filters by it", () => {
    expect(listTopics()).toEqual(["everyday", "travel", "business", "academic", "technology", "education", "culture"]);
    expect(wordTopic(getWord("bright")!)).toBe("everyday");
    expect(wordTopic(getWord("ticket")!)).toBe("travel");
    const travel = searchWords({ topic: "travel" });
    expect(travel.length).toBeGreaterThanOrEqual(5);
    expect(travel.every((w) => wordTopic(w) === "travel")).toBe(true);
    expect(searchWords({ level: "A1", topic: "travel" }).map((w) => w.slug).sort()).toEqual(["journey", "map", "ticket"]);
  });
  it("returns same-level related words", () => {
    const w = getWord("bright")!;
    const rel = relatedWords(w);
    expect(rel).toHaveLength(4);
    expect(rel.every((r) => r.level === "A1" && r.slug !== "bright")).toBe(true);
  });
});

describe("mastery", () => {
  it("maps bands correctly", () => {
    expect(masteryBand(0)).toBe("new");
    expect(masteryBand(20)).toBe("learning");
    expect(masteryBand(60)).toBe("familiar");
    expect(masteryBand(80)).toBe("mastered");
    expect(masteryBand(100)).toBe("mastered");
  });
  it("applies reviews with clamping", () => {
    expect(applyReview(0, true)).toBe(20);
    expect(applyReview(90, true)).toBe(100);
    expect(applyReview(10, false)).toBe(0);
    expect(applyReview(50, false)).toBe(35);
  });
  it("applies gentler practice deltas", () => {
    expect(applyPracticeResult(0, true)).toBe(10);
    expect(applyPracticeResult(5, false)).toBe(0);
  });
  it("schedules longer intervals as mastery grows", () => {
    const days = [0, 30, 50, 70, 95].map(reviewIntervalDays);
    expect(days).toEqual([1, 2, 4, 7, 14]);
    expect(nextReviewDate(0, new Date("2026-10-05T00:00:00Z"))).toBe("2026-10-06");
  });
  it("detects due cards", () => {
    expect(isDue(null, "2026-10-05")).toBe(true);
    expect(isDue("2026-10-05", "2026-10-05")).toBe(true);
    expect(isDue("2026-10-06", "2026-10-05")).toBe(false);
  });
  it("awards more XP for known cards", () => {
    expect(reviewXp(true)).toBeGreaterThan(reviewXp(false));
  });
});

describe("practice sets", () => {
  it("builds deterministic 8-question sets with 4 choices", () => {
    const a = buildPracticeSet({ seedKey: "2026-10-05:B1", level: "B1" });
    const b = buildPracticeSet({ seedKey: "2026-10-05:B1", level: "B1" });
    expect(a.questions).toHaveLength(8);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
    for (const q of a.questions) {
      expect(q.choices).toHaveLength(4);
      expect(q.choices[q.answer]).toBeDefined();
    }
  });
  it("prefers saved low-mastery words first", () => {
    const preferred = [getWord("bright")!, getWord("persist")!];
    const set = buildPracticeSet({ seedKey: "x", preferred, count: 4 });
    expect(set.questions[0].word).toBe("bright");
    expect(set.questions[1].word).toBe("persist");
  });
  it("hides answers in the public shape", () => {
    const pub = toPublicPracticeSet(buildPracticeSet({ seedKey: "x" }));
    for (const q of pub.questions) expect((q as Record<string, unknown>).answer).toBeUndefined();
  });
  it("grades perfectly with bonus", () => {
    const set = buildPracticeSet({ seedKey: "x" });
    const answers: Record<string, number> = {};
    for (const q of set.questions) answers[q.id] = q.answer;
    const g = gradePracticeSet(set, answers);
    expect(g.score).toBe(8);
    expect(g.xpEarned).toBe(8 * 5 + 10);
    expect(g.perfect).toBe(true);
  });
  it("grades by word without trusting client answer indexes", () => {
    const set = buildPracticeSet({ seedKey: "grade-me" });
    const selections = set.questions.map((q) => ({ word: q.word, selected: q.choices.indexOf(q.choices[q.answer]), choices: q.choices }));
    const g = gradePracticeByWord(selections);
    expect(g.score).toBe(set.questions.length);
    const wrong = selections.map((s, i) => (i === 0 ? { ...s, selected: (s.selected + 1) % s.choices.length } : s));
    expect(gradePracticeByWord(wrong).score).toBe(set.questions.length - 1);
  });
});
