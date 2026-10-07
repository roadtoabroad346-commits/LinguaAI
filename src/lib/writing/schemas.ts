/** Phase 5 — zod schemas for writing + AI teacher APIs. */
import { z } from "zod";

export const writingCheckSchema = z.object({
  taskSlug: z.string().trim().min(1).max(80),
  text: z.string().trim().min(10).max(3000),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

export const teacherChatSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
  interfaceLanguage: z.enum(["kk", "ru", "en"]).optional(),
});
