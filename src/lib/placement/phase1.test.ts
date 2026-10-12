import { describe, it, expect } from "vitest";
import { gradePlacement, scoreToLevel, buildReview, weakestBand, missedTopics } from "@/lib/placement/scoring";
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

  it("every question carries topic + explanation for the review UI", () => {
    for (const q of PLACEMENT_QUESTIONS) {
      expect(q.topic.trim().length).toBeGreaterThan(0);
      expect(q.explanation.trim().length).toBeGreaterThan(10);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThanOrEqual(3);
    }
  });

  it("builds a mistake review with weakest band and topics", () => {
    const inputs = PLACEMENT_QUESTIONS.map((q) => ({
      questionId: q.id,
      // miss every B2 question, answer everything else correctly
      selected: q.level === "B2" ? (q.answer + 1) % 4 : q.answer,
    }));
    const g = gradePlacement(inputs);
    const review = buildReview(g);
    expect(review).toHaveLength(20);
    expect(review.filter((r) => !r.correct)).toHaveLength(4);
    expect(weakestBand(g.perBand)).toBe("B2");
    expect(missedTopics(review)).toContain("Phrasal verbs");
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
