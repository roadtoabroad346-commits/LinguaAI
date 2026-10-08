/** Phase 4 — zod schemas for grammar/reading/listening APIs. */
import { z } from "zod";

const selection = z.object({
  questionId: z.string().min(1).max(80),
  selected: z.number().int().min(0).max(9),
  choices: z.array(z.string().max(600)).min(2).max(6),
});

export const grammarCompleteSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  selections: z.array(selection).min(1).max(12),
});

export const readingCompleteSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  selections: z.array(selection).min(1).max(12),
});

export const listeningCompleteSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  selections: z.array(selection).min(1).max(12),
});

export const dictationSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  index: z.number().int().min(0).max(30),
  text: z.string().trim().min(1).max(1000),
});

export const pronunciationCompleteSchema = z.object({
  slug: z.string().trim().min(1).max(80),
  /** Learner self-rating 1–5 (honest practice estimate, never fake precision). */
  rating: z.number().int().min(1).max(5),
});
