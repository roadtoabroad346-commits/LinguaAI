/** Phase 6 — zod schemas for speaking + read-aloud APIs. */
import { z } from "zod";

export const speakingFeedbackSchema = z.object({
  topicSlug: z.string().trim().min(1).max(80),
  transcript: z.string().trim().min(10).max(3000),
  durationSecs: z.number().int().min(0).max(3600).default(0),
});

export const readAloudCheckSchema = z.object({
  passageSlug: z.string().trim().min(1).max(80),
  transcript: z.string().trim().min(5).max(4000),
  durationSecs: z.number().int().min(0).max(3600).default(0),
});
