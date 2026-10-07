import { describe, expect, it } from "vitest";
import { buildSpellingSet, gradeSpellingSet, maskWord, misspellings, normalizeSpelling, repeatedSessionResult } from "./spelling";

describe("maskWord", () => {
  it("keeps the first letter and hides 1-3 letters", () => {
    const m = maskWord("opportunity", 42);
    expect(m[0]).toBe("o");
    expect(m).toContain("_");
    expect(m.length).toBe("opportunity".length);
    expect((m.match(/_/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect((m.match(/_/g) ?? []).length).toBeLessThanOrEqual(3);
  });
  it("is deterministic per seed", () => {
    expect(maskWord("reliable", 7)).toBe(maskWord("reliable", 7));
  });
});

describe("misspellings", () => {
  it("returns 3 unique non-equal distractors", () => {
    const d = misspellings("reliable", 3);
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d).not.toContain("reliable");
  });
});

describe("buildSpellingSet", () => {
  it("builds deterministic sets per mode", () => {
    const a = buildSpellingSet({ seedKey: "2026-10-05", mode: "choice", level: "B1" });
    const b = buildSpellingSet({ seedKey: "2026-10-05", mode: "choice", level: "B1" });
    expect(a.items.map((i) => i.slug)).toEqual(b.items.map((i) => i.slug));
    expect(a.items).toHaveLength(8);
    for (const item of a.items) {
      expect(item.choices).toHaveLength(4);
      expect(item.choices).toContain(item.word);
    }
  });
  it("missing mode masks every word", () => {
    const s = buildSpellingSet({ seedKey: "k", mode: "missing", level: "A1", count: 4 });
    expect(s.items).toHaveLength(4);
    for (const item of s.items) {
      expect(item.masked).toBeDefined();
      expect(item.masked).toContain("_");
    }
  });
  it("listen mode has no choices", () => {
    const s = buildSpellingSet({ seedKey: "k", mode: "listen", level: "A1", count: 4 });
    for (const item of s.items) expect(item.choices).toBeUndefined();
  });
  it("clamps count to 4-12", () => {
    expect(buildSpellingSet({ seedKey: "k", mode: "listen", count: 99 }).items.length).toBeLessThanOrEqual(12);
    expect(buildSpellingSet({ seedKey: "k", mode: "listen", count: 1 }).items.length).toBeGreaterThanOrEqual(4);
  });
});

describe("gradeSpellingSet", () => {
  it("grades typed answers case-insensitively", () => {
    const g = gradeSpellingSet("listen", [
      { slug: "happy", typed: "  HAPPY " },
      { slug: "bright", typed: "brihgt" },
    ]);
    expect(g.score).toBe(1);
    expect(g.total).toBe(2);
    expect(g.correctSlugs).toEqual(["happy"]);
    expect(g.wrongSlugs).toEqual(["bright"]);
    expect(g.xpEarned).toBe(5);
    expect(g.perfect).toBe(false);
  });
  it("awards bonus on perfect", () => {
    const g = gradeSpellingSet("missing", [{ slug: "happy", typed: "happy" }]);
    expect(g.perfect).toBe(true);
    expect(g.xpEarned).toBe(5 + 10);
  });
  it("grades choice answers against bank words", () => {
    const set = buildSpellingSet({ seedKey: "2026-10-05", mode: "choice", level: "A1", count: 4 });
    const answers = set.items.map((item) => ({
      slug: item.slug,
      selected: item.choices!.indexOf(item.word),
      choices: item.choices!,
    }));
    const g = gradeSpellingSet("choice", answers);
    expect(g.score).toBe(4);
    expect(g.perfect).toBe(true);
  });
  it("rejects out-of-range selections", () => {
    const g = gradeSpellingSet("choice", [{ slug: "happy", selected: 9, choices: ["a", "b"] }]);
    expect(g.score).toBe(0);
  });
  it("counts unknown slugs as wrong", () => {
    const g = gradeSpellingSet("listen", [{ slug: "nope", typed: "nope" }]);
    expect(g.score).toBe(0);
    expect(g.wrongSlugs).toEqual(["nope"]);
  });
});

describe("normalizeSpelling", () => {
  it("trims and lowercases", () => {
    expect(normalizeSpelling("  Hello ")).toBe("hello");
  });
});

describe("meaning mode", () => {
  it("builds base items with definitions", () => {
    const s = buildSpellingSet({ seedKey: "k", mode: "meaning", level: "A1", count: 4 });
    expect(s.items).toHaveLength(4);
    for (const item of s.items) {
      expect(item.choices).toBeUndefined();
      expect(item.masked).toBeUndefined();
      expect(item.definition.length).toBeGreaterThan(0);
    }
  });
  it("grades typed answers against the bank word", () => {
    const g = gradeSpellingSet("meaning", [
      { slug: "happy", typed: "happy" },
      { slug: "bright", typed: "wrong" },
    ]);
    expect(g.score).toBe(1);
    expect(g.correctSlugs).toEqual(["happy"]);
    expect(g.wrongSlugs).toEqual(["bright"]);
  });
});

describe("repeatedSessionResult (idempotency)", () => {
  it("returns the stored grade with zero new XP", () => {
    const r = repeatedSessionResult({
      sessionId: "sess-1",
      mode: "meaning",
      score: 3,
      total: 4,
      correctSlugs: ["a", "b", "c"],
      wrongSlugs: ["d"],
      xpEarned: 25,
      perfect: false,
    });
    expect(r.repeated).toBe(true);
    expect(r.saved).toBe(true);
    expect(r.xpAwarded).toBe(0);
    expect(r.score).toBe(3);
    expect(r.total).toBe(4);
    expect(r.sessionId).toBe("sess-1");
    expect(r.newAchievements).toEqual([]);
    // Original xpEarned is preserved for display; nothing new is granted.
    expect(r.xpEarned).toBe(25);
  });
});
