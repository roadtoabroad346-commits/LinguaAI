/**
 * Idempotent completion claims — anti double-XP guard for all
 * XP-bearing completion endpoints (grammar, reading, listening,
 * dictation, pronunciation, vocab practice, flashcards, writing,
 * speaking, read-aloud).
 *
 * Protocol:
 * - Client generates one UUID per attempt (`crypto.randomUUID()`) and sends
 *   it as the required `idempotencyKey`.
 * - Server calls `claimCompletion()` BEFORE inserting history rows / awarding
 *   XP. `{ fresh: true }` → proceed. `{ fresh: false }` → return the grade
 *   with `repeated: true` and award nothing.
 * - The UNIQUE(user_id, scope, key) constraint makes concurrent double-posts
 *   safe: the loser re-reads the winner and returns `repeated: true`.
 * - Fail closed on database errors so an unavailable idempotency store can
 *   never turn a retry into duplicate XP.
 */
import { z } from "zod";

export const idempotencyKeySchema = z.string().trim().min(8).max(120);

export type CompletionScope =
  | "grammar" | "reading" | "listening" | "dictation" | "pronunciation"
  | "vocab_practice" | "flashcards" | "writing" | "speaking" | "read_aloud"
  | "placement";

type ClaimsClient = {
  from(table: string): any;
};

export async function claimCompletion(
  supabase: ClaimsClient,
  userId: string,
  scope: CompletionScope,
  key: string | null | undefined
): Promise<{ fresh: boolean }> {
  if (!key || typeof key !== "string" || key.trim().length < 8) {
    return { fresh: true };
  }
  const k = key.trim().slice(0, 120);
  try {
    const { data: prior } = await supabase
      .from("completion_claims")
      .select("id")
      .eq("user_id", userId)
      .eq("scope", scope)
      .eq("key", k)
      .maybeSingle();
    if (prior) return { fresh: false };
  } catch {
    throw new Error("Could not verify completion.");
  }
  try {
    const { error } = await supabase
      .from("completion_claims")
      .insert({ user_id: userId, scope, key: k } as never);
    if (!error) return { fresh: true };
    // Likely a concurrent winner (UNIQUE violation) — verify.
    try {
      const { data: raced } = await supabase
        .from("completion_claims")
        .select("id")
        .eq("user_id", userId)
        .eq("scope", scope)
        .eq("key", k)
        .maybeSingle();
      if (raced) return { fresh: false };
    } catch {
      throw new Error("Could not verify completion.");
    }
    throw new Error("Could not reserve completion.");
  } catch {
    throw new Error("Could not reserve completion.");
  }
}
