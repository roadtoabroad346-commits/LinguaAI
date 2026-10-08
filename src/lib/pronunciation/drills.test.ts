import { describe, expect, it } from "vitest";
import {
  PRONUNCIATION_DRILLS,
  getPronunciationDrill,
  listPronunciationDrills,
  scoreFromSelfRating,
  KIND_LABEL,
} from "./drills";

describe("pronunciation drills", () => {
  it("has 24 unique drills covering every level and kind", () => {
    expect(PRONUNCIATION_DRILLS).toHaveLength(24);
    expect(new Set(PRONUNCIATION_DRILLS.map((x) => x.slug)).size).toBe(24);
    for (const level of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(listPronunciationDrills(level).length).toBeGreaterThanOrEqual(4);
    }
    for (const kind of Object.keys(KIND_LABEL)) {
      expect(listPronunciationDrills(null, kind).length).toBeGreaterThanOrEqual(3);
    }
  });
  it("every drill is practicable (tip + examples + lines)", () => {
    for (const x of PRONUNCIATION_DRILLS) {
      expect(x.title.length).toBeGreaterThan(3);
      expect(x.focus.length).toBeGreaterThan(3);
      expect(x.tip.length).toBeGreaterThan(10);
      expect(x.examples.length).toBeGreaterThanOrEqual(3);
      expect(x.practiceLines.length).toBeGreaterThanOrEqual(3);
      expect(x.syllables.length).toBeGreaterThan(2);
    }
  });
  it("looks up case-insensitively and filters", () => {
    expect(getPronunciationDrill(" Ship-Sheep ")?.level).toBe("A1");
    expect(getPronunciationDrill("nope")).toBeNull();
    expect(listPronunciationDrills("C1", "linking")).toHaveLength(1);
  });
  it("maps self-ratings to honest band scores", () => {
    expect(scoreFromSelfRating(1)).toBe(20);
    expect(scoreFromSelfRating(3)).toBe(60);
    expect(scoreFromSelfRating(5)).toBe(100);
    expect(scoreFromSelfRating(99)).toBe(100);
    expect(scoreFromSelfRating(0)).toBe(20);
  });
});
