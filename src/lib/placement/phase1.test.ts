import { describe, it, expect } from "vitest";
import { gradePlacement, scoreToLevel } from "@/lib/placement/scoring";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import { onboardingSchema, placementSubmitSchema, signInSchema, signUpSchema } from "@/lib/auth/schemas";

function allCorrect() {
  return PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selected: q.answer }));
}
function firstNCorrect(n: number) {
  return PLACEMENT_QUESTIONS.map((q, i) => ({
    questionId: q.id,
    selected: i < n ? q.answer : (q.answer + 1) % 4,
  }));
}

describe("placement scoring", () => {
  it("has 20 questions, 4 per band", () => {
    expect(PLACEMENT_QUESTIONS).toHaveLength(20);
    for (const band of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(PLACEMENT_QUESTIONS.filter((q) => q.level === band)).toHaveLength(4);
    }
  });

  it("maps score thresholds to CEFR levels", () => {
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

  it("grades a perfect paper as C1", () => {
    const g = gradePlacement(allCorrect());
    expect(g.score).toBe(20);
    expect(g.level).toBe("C1");
    expect(g.answers).toHaveLength(20);
  });

  it("grades 12 correct as B1 with per-band counts", () => {
    const g = gradePlacement(firstNCorrect(12));
    expect(g.score).toBe(12);
    expect(g.level).toBe("B1");
    expect(g.perBand.A1.correct).toBe(4);
    expect(g.perBand.B1.correct).toBe(4);
  });

  it("ignores unknown ids and duplicates deterministically", () => {
    const g = gradePlacement([
      { questionId: "nope", selected: 0 },
      { questionId: "a1-1", selected: PLACEMENT_QUESTIONS[0].answer },
      { questionId: "a1-1", selected: 0 },
    ]);
    expect(g.score).toBe(1);
    expect(g.answers).toHaveLength(1);
  });
});

describe("auth + onboarding schemas", () => {
  it("rejects bad signup input", () => {
    expect(signUpSchema.safeParse({ email: "x", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.com", password: "longenough1" }).success).toBe(true);
  });

  it("requires email + password on sign in", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });

  it("validates onboarding payload", () => {
    const ok = {
      displayName: "Anna",
      nativeLanguage: "Ukrainian",
      goals: ["Travel"],
      dailyGoalXp: 30,
      learningMode: "guided" as const,
    };
    expect(onboardingSchema.safeParse(ok).success).toBe(true);
    expect(onboardingSchema.safeParse({ ...ok, goals: [] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...ok, dailyGoalXp: 500 }).success).toBe(false);
  });

  it("validates placement submit payload", () => {
    expect(placementSubmitSchema.safeParse({ answers: [] }).success).toBe(false);
    expect(
      placementSubmitSchema.safeParse({ answers: [{ questionId: "a1-1", selected: 1 }] }).success
    ).toBe(true);
  });
});
