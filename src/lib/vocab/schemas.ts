/** Phase 3 — zod schemas for vocabulary APIs. */
import { z } from "zod";

export const saveWordSchema = z.object({
  word: z.string().trim().min(1).max(64),
});

export const removeWordSchema = z.object({
  word: z.string().trim().min(1).max(64),
});

export const updateEntrySchema = z.object({
  word: z.string().trim().min(1).max(64),
  translation: z.string().trim().max(200).optional(),
});

export const flashReviewSchema = z.object({
  word: z.string().trim().min(1).max(64),
  known: z.boolean(),
});

export const translateSchema = z.object({
  word: z.string().trim().min(1).max(64),
  targetLang: z.string().trim().min(2).max(48).default("Spanish"),
});

export const practiceCompleteSchema = z.object({
  selections: z.array(z.object({
    word: z.string().min(1).max(64),
    selected: z.number().int().min(0).max(9),
    choices: z.array(z.string().max(500)).min(2).max(6),
  })).min(1).max(12),
});
