import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, onboardingSchema, placementSubmitSchema, profileUpdateSchema, resetPasswordSchema } from "./schemas";

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
  it("accepts a valid recovery email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.com" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
  it("requires matching 8+ char passwords on reset", () => {
    expect(resetPasswordSchema.safeParse({ password: "longenough1", confirm: "longenough1" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ password: "longenough1", confirm: "other1234" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ password: "short", confirm: "short" }).success).toBe(false);
  });
});
