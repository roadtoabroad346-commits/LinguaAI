import { z } from "zod";

export const xpAwardSchema = z.object({
  amount: z.number().int().min(1).max(1000),
  source: z.string().min(1).max(64),
  activityKind: z.string().max(64).optional(),
  activityTitle: z.string().max(120).optional(),
  activityHref: z.string().max(200).optional(),
});

export const challengeCompleteSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  answers: z.record(z.string(), z.number().int().min(0).max(9)),
});

export const recommendRequestSchema = z.object({
  goal: z.string().max(200).optional(),
});
