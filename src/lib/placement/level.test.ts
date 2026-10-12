import { describe, it, expect } from "vitest";
import { scoreToLevel } from "@/lib/placement/scoring";
import { levelInputSchema, levelSchema } from "@/lib/auth/schemas";
import { LEVELS } from "@/lib/constants";

describe("level recording", () => {
  it("maps boundary scores to the documented thresholds", () => {
    // Thresholds: 0–5 A1, 6–9 A2, 10–13 B1, 14–17 B2, 18–20 C1.
    expect(scoreToLevel(0)).toBe("A1");
    expect(scoreToLevel(5)).toBe("A1");
    expect(scoreToLevel(6)).toBe("A2");
    expect(scoreToLevel(9)).toBe("A2");
    expect(scoreToLevel(10)).toBe("B1");
    expect(scoreToLevel(13)).toBe("B1");
    expect(scoreToLevel(14)).toBe("B2");
    expect(scoreToLevel(17)).toBe("B2");
    expect(scoreToLevel(18)).toBe("C1");
    expect(scoreToLevel(20)).toBe("C1");
  });

  it("accepts only canonical levels strictly", () => {
    for (const l of LEVELS) expect(levelSchema.safeParse(l).success).toBe(true);
    expect(levelSchema.safeParse("b1").success).toBe(false);
    expect(levelSchema.safeParse(" B1 ").success).toBe(false);
    expect(levelSchema.safeParse("D1").success).toBe(false);
  });

  it("normalizes lenient input to canonical levels", () => {
    expect(levelInputSchema.parse("b1")).toBe("B1");
    expect(levelInputSchema.parse(" B2 ")).toBe("B2");
    expect(levelInputSchema.parse("a1")).toBe("A1");
    expect(levelInputSchema.safeParse("D1").success).toBe(false);
    expect(levelInputSchema.safeParse("").success).toBe(false);
  });
});
