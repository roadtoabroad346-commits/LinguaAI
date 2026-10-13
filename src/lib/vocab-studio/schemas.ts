/** Flashcards Pro — zod schemas for sets, cards, imports, reviews. Pure validation, no I/O. */
import { z } from "zod";

export const SET_COLORS = ["brand", "emerald", "amber", "rose", "violet", "sky", "slate"] as const;
export const SET_LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export const CARD_POS = [
  "noun", "verb", "adjective", "adverb",
  "phrase", "idiom", "phrasal-verb", "collocation", "expression", "other",
] as const;
export const REVIEW_RATINGS = ["again", "hard", "good", "easy", "known", "unknown"] as const;
export const CARD_STATUS = ["new", "learning", "review", "relearning", "mastered"] as const;

const strList = (maxItems = 20, maxLen = 120) =>
  z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).default([]);

export const createSetSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  description: z.string().trim().max(1000).default(""),
  language: z.string().trim().min(2).max(32).default("en"),
  nativeLanguage: z.string().trim().max(32).default(""),
  level: z.enum(SET_LEVELS).nullable().optional(),
  category: z.string().trim().min(1).max(64).default("general"),
  color: z.enum(SET_COLORS).default("brand"),
  icon: z.string().trim().min(1).max(48).default("layers"),
});

export const updateSetSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  language: z.string().trim().min(2).max(32).optional(),
  nativeLanguage: z.string().trim().max(32).optional(),
  level: z.enum(SET_LEVELS).nullable().optional(),
  category: z.string().trim().min(1).max(64).optional(),
  color: z.enum(SET_COLORS).optional(),
  icon: z.string().trim().min(1).max(48).optional(),
  isArchived: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

export type CreateSetInput = z.infer<typeof createSetSchema>;
export type UpdateSetInput = z.infer<typeof updateSetSchema>;

export const cardSchema = z.object({
  front: z.string().trim().min(1, "Front text is required.").max(500),
  back: z.string().trim().min(1, "Back text is required.").max(2000),
  word: z.string().trim().min(1, "Word or phrase is required.").max(200),
  definition: z.string().trim().max(2000).default(""),
  example: z.string().trim().max(2000).default(""),
  exampleTranslation: z.string().trim().max(2000).default(""),
  partOfSpeech: z.enum(CARD_POS).nullable().optional(),
  level: z.enum(SET_LEVELS).nullable().optional(),
  phonetic: z.string().trim().max(120).default(""),
  synonyms: strList(),
  antonyms: strList(),
  collocations: strList(20, 200),
  grammarNotes: z.string().trim().max(2000).default(""),
  personalNotes: z.string().trim().max(2000).default(""),
  tags: strList(20, 48),
  source: z.string().trim().min(1).max(120).default("custom"),
});

export type CardInput = z.infer<typeof cardSchema>;

export const updateCardSchema = cardSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "No fields to update." }
);

export const importModeSchema = z.enum(["skip", "update", "import"]);

export const importRowSchema = cardSchema.extend({
  /** Optional client-side stable key for idempotent bulk inserts. */
  clientKey: z.string().trim().max(120).optional(),
});

export const bulkImportSchema = z.object({
  mode: importModeSchema.default("skip"),
  rows: z.array(importRowSchema).min(1, "No rows to import.").max(500),
});

export const quickBulkSchema = z.object({
  mode: importModeSchema.default("skip"),
  /** Multiline pasted text: `front | back` or `word — definition` per line. */
  text: z.string().trim().min(1).max(200_000),
});

export const reviewSubmitSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.enum(REVIEW_RATINGS),
  /** Client-generated UUID per attempt; server dedupes on (user, key). */
  idempotencyKey: z.string().trim().min(8).max(120),
  durationMs: z.number().int().min(0).max(3_600_000).optional(),
});

export type ReviewSubmitInput = z.infer<typeof reviewSubmitSchema>;

export const aiAssistSchema = z.object({
  word: z.string().trim().min(1).max(200),
  targetLanguage: z.string().trim().min(2).max(48).default("English"),
  nativeLanguage: z.string().trim().max(48).default(""),
  level: z.enum(SET_LEVELS).nullable().optional(),
  context: z.string().trim().max(1000).default(""),
});

export type AiAssistInput = z.infer<typeof aiAssistSchema>;
