import { z } from "zod";
import { LEVELS } from "@/lib/constants";
import { isValidTimezone } from "@/lib/dashboard/streak";

export const levelSchema = z.enum(LEVELS);

/**
 * Lenient level input: trims whitespace and uppercases before validating,
 * so " b1 " or "b2" are accepted and stored as "B1"/"B2". Canonical output
 * is always one of LEVELS.
 */
export const levelInputSchema = z.preprocess(
  (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
  levelSchema
);
export type LevelInput = z.infer<typeof levelInputSchema>;

export const emailSchema = z.string().email("Enter a valid email address");
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const signUpSchema = z.object({
  displayName: z.string().trim().max(60).optional().default(""),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, "Repeat your new password"),
  })
  .refine((v) => v.password === v.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const GOAL_OPTIONS = [
  "Everyday conversation",
  "Work & career",
  "Travel",
  "Exams (IELTS/TOEFL)",
  "Study abroad",
  "Fun & culture",
] as const;

export const NATIVE_LANGUAGES = [
  "Ukrainian",
  "Spanish",
  "French",
  "German",
  "Polish",
  "Portuguese",
  "Turkish",
  "Arabic",
  "Hindi",
  "Chinese",
  "Other",
] as const;

export const onboardingSchema = z.object({
  displayName: z.string().trim().min(1, "Enter your name").max(60),
  nativeLanguage: z.string().trim().min(1, "Select your native language").max(40),
  goals: z.array(z.string().trim().min(1)).min(1, "Pick at least one goal").max(6),
  dailyGoalXp: z.coerce.number().int().min(10, "Minimum 10 XP").max(200, "Maximum 200 XP"),
  learningMode: z.enum(["guided", "free"]),
  preferredLanguage: z.enum(["kk", "ru", "en"]).optional().default("en"),
  onboardingStep: z.coerce.number().int().min(0).max(20).optional().default(0),
  targetExam: z.string().trim().max(40).optional(),
  targetScore: z.string().trim().max(20).optional(),
  targetDate: z.string().trim().max(20).optional(),
  dailyGoalMinutes: z.coerce.number().int().min(5).max(240).optional(),
  prioritySkills: z.array(z.string().trim().min(1)).max(8).optional().default([]),
  interests: z.array(z.string().trim().min(1)).max(12).optional().default([]),
  studyTimePreference: z.string().trim().max(40).optional(),
  obstacles: z.array(z.string().trim().min(1)).max(8).optional().default([]),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  level: levelInputSchema.optional(),
  nativeLanguage: z.string().trim().max(40).optional(),
  goals: z.array(z.string().trim().min(1)).max(6).optional(),
  dailyGoalXp: z.coerce.number().int().min(10).max(200).optional(),
  learningMode: z.enum(["guided", "free"]).optional(),
  preferredLanguage: z.enum(["kk", "ru", "en"]).optional(),
  timezone: z.string().trim().min(1).max(64).refine((tz) => isValidTimezone(tz), "Unknown timezone").optional(),
  onboardingStep: z.coerce.number().int().min(0).max(20).optional(),
  targetExam: z.string().trim().max(40).optional(),
  targetScore: z.string().trim().max(20).optional(),
  targetDate: z.string().trim().max(20).optional(),
  dailyGoalMinutes: z.coerce.number().int().min(5).max(240).optional(),
  prioritySkills: z.array(z.string().trim().min(1)).max(8).optional(),
  interests: z.array(z.string().trim().min(1)).max(12).optional(),
  studyTimePreference: z.string().trim().max(40).optional(),
  obstacles: z.array(z.string().trim().min(1)).max(8).optional(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

const spellingAnswerSchema = z.object({
  slug: z.string().min(1).max(80),
  typed: z.string().trim().max(80).optional(),
  selected: z.number().int().min(0).max(10).optional(),
  choices: z.array(z.string().max(80)).max(10).optional(),
});

export const placementSubmitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().min(1), selected: z.number().int().min(0).max(3) }))
    .max(100)
    .optional()
    .default([]),
  reading: z
    .array(z.object({ questionId: z.string().min(1), selected: z.number().int().min(0).max(10) }))
    .max(50)
    .optional()
    .default([]),
  listening: z
    .array(z.object({ questionId: z.string().min(1), selected: z.number().int().min(0).max(10) }))
    .max(50)
    .optional()
    .default([]),
  spelling: z.array(spellingAnswerSchema).max(30).optional().default([]),
  writingText: z.string().max(4000).optional().default(""),
  speakingTranscript: z.string().max(4000).optional().default(""),
  speakingSecs: z.coerce.number().min(0).max(3600).optional().default(0),
  pronunciationTranscript: z.string().max(3000).optional().default(""),
  pronunciationSecs: z.coerce.number().min(0).max(3600).optional().default(0),
  learningMode: z.enum(["guided", "free"]).optional(),
  durationSeconds: z.coerce.number().int().min(0).max(7200).optional(),
  testVersion: z.string().trim().max(20).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
}).superRefine((v, ctx) => {
  const total =
    (v.answers?.length ?? 0) +
    (v.reading?.length ?? 0) +
    (v.listening?.length ?? 0) +
    (v.spelling?.length ?? 0) +
    (v.writingText.trim().length > 0 ? 1 : 0) +
    (v.speakingTranscript.trim().length > 0 ? 1 : 0) +
    (v.pronunciationTranscript.trim().length > 0 ? 1 : 0);
  if (total === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Answer at least one question", path: ["answers"] });
  }
});
export type PlacementSubmitInput = z.infer<typeof placementSubmitSchema>;

/** Server-side draft payload: same shapes as submit, but partial is allowed. */
export const placementDraftPayloadSchema = z.object({
  answers: z.record(z.string().min(1).max(80), z.number().int().min(0).max(10)).optional().default({}),
  reading: z.record(z.string().min(1).max(80), z.number().int().min(0).max(10)).optional().default({}),
  listening: z.record(z.string().min(1).max(80), z.number().int().min(0).max(10)).optional().default({}),
  spelling: z
    .record(
      z.string().min(1).max(80),
      z.object({
        typed: z.string().max(80).optional(),
        selected: z.number().int().min(0).max(10).optional(),
        choices: z.array(z.string().max(80)).max(10).optional(),
      })
    )
    .optional()
    .default({}),
  writingText: z.string().max(3000).optional().default(""),
  speakingTranscript: z.string().max(3000).optional().default(""),
  speakingSecs: z.coerce.number().min(0).max(600).optional().default(0),
  pronunciationTranscript: z.string().max(2000).optional().default(""),
  pronunciationSecs: z.coerce.number().min(0).max(600).optional().default(0),
  learningMode: z.enum(["guided", "free"]).optional().default("guided"),
});
export type PlacementDraftPayload = z.infer<typeof placementDraftPayloadSchema>;

export const placementDraftUpsertSchema = z.object({
  attemptKey: z.string().trim().min(4).max(120),
  sectionIndex: z.coerce.number().int().min(0).max(19).optional().default(0),
  payload: placementDraftPayloadSchema,
});
export type PlacementDraftUpsert = z.infer<typeof placementDraftUpsertSchema>;
