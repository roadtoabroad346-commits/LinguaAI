import { z } from "zod";

export const spellingModeSchema = z.enum(["listen", "meaning", "missing", "choice"]);

export const spellingAnswerSchema = z.object({
  slug: z.string().min(1).max(64),
  typed: z.string().max(64).optional(),
  selected: z.number().int().min(0).max(9).optional(),
  choices: z.array(z.string().max(64)).max(8).optional(),
});

export const spellingCompleteSchema = z.object({
  mode: spellingModeSchema,
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional(),
  sessionId: z.string().uuid().optional(),
  answers: z.array(spellingAnswerSchema).min(1).max(12),
});
