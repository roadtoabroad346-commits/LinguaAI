/**
 * Client half of idempotent completions (see src/lib/completions/claims.ts).
 * Generate one key per attempt and reuse it for retries of THAT attempt;
 * mint a fresh key when the learner starts a NEW attempt.
 */
export function newAttemptKey(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to Math fallback */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
