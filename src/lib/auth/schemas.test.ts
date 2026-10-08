import { describe, expect, it } from "vitest";
import { onboardingSchema, placementSubmitSchema, profileUpdateSchema } from "./schemas";

describe("auth payload validation", () => {
  it("accepts a complete onboarding payload with new personalization fields", () => {
    const r = onboardingSchema.safeParse({
      displayName: "Anna",
      nativeLanguage: "Kazakh",
      goals: ["Travel"],
      dailyGoalXp: 30,
      learningMode: "guided",
      preferredLanguage: "en",
      onboardingStep: 3,
      targetExam: "IELTS",
      targetScore: "7.0",
      prioritySkills: ["speaking"],
      interests: ["travel"],
      obstacles: ["time"],
    });
    expect(r.success).toBe(true);
  });
  it("rejects empty onboarding", () => {
    expect(
      onboardingSchema.safeParse({
        displayName: "",
        nativeLanguage: "",
        goals: [],
        dailyGoalXp: 5,
        learningMode: "guided",
      }).success
    ).toBe(false);
  });
  it("accepts placement payload with duration", () => {
    const r = placementSubmitSchema.safeParse({
      answers: [{ questionId: "q1", selected: 0 }],
      learningMode: "guided",
      durationSeconds: 300,
    });
    expect(r.success).toBe(true);
  });
  it("rejects placement without answers", () => {
    expect(placementSubmitSchema.safeParse({ answers: [] }).success).toBe(false);
  });
  it("accepts partial profile updates with new columns", () => {
    const r = profileUpdateSchema.safeParse({ onboardingStep: 2, prioritySkills: ["reading"] });
    expect(r.success).toBe(true);
    expect(profileUpdateSchema.safeParse({ timezone: "Not/AZone" }).success).toBe(false);
  });
});
