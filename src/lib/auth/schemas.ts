import { z } from "zod";
import { LEVELS } from "@/lib/constants";
import { isValidTimezone } from "@/lib/dashboard/streak";

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

export const placementSubmitSchema = z.object({
  answers: z
    .array(z.object({ questionId: z.string().min(1), selected: z.number().int().min(0).max(3) }))
    .min(1, "Answer at least one question"),
  learningMode: z.enum(["guided", "free"]).optional(),
  durationSeconds: z.coerce.number().int().min(0).max(7200).optional(),
  testVersion: z.string().trim().max(20).optional(),
});
export type PlacementSubmitInput = z.infer<typeof placementSubmitSchema>;

export const levelSchema = z.enum(LEVELS);
