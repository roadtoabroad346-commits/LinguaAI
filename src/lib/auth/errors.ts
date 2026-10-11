/** Map raw Supabase Auth English errors to localized, human-friendly strings. */

export function friendlyAuthError(raw: unknown, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const msg = typeof raw === "string" ? raw : raw instanceof Error ? raw.message : "";
  const low = msg.toLowerCase();
  if (!low) return t("auth.errors.generic");
  if (low.includes("invalid login credentials") || low.includes("invalid email or password")) {
    return t("auth.errors.invalidCredentials");
  }
  if (low.includes("email not confirmed") || low.includes("email_not_confirmed")) {
    return t("auth.errors.emailNotConfirmed");
  }
  if (low.includes("user already registered") || low.includes("already registered") || low.includes("already exists")) {
    return t("auth.errors.userExists");
  }
  if (
    low.includes("rate limit") ||
    low.includes("too many requests") ||
    low.includes("over_email_send_rate_limit") ||
    low.includes("for security purposes") ||
    low.includes("email rate limit")
  ) {
    return t("auth.errors.tooManyRequests");
  }
  if (low.includes("password should be") || low.includes("weak password") || low.includes("password is too weak")) {
    return t("auth.errors.weakPassword");
  }
  if (low.includes("expired") || low.includes("token has expired") || low.includes("invalid token")) {
    return t("auth.errors.expiredLink");
  }
  if (low.includes("same password") || low.includes("new password should be different")) {
    return t("auth.errors.samePassword");
  }
  // Fallback: short English from Supabase is confusing for RU/KK users,
  // but showing something is better than a raw key. Keep short messages,
  // collapse long JWT-ish blobs.
  if (msg.length <= 160) return msg;
  return t("auth.errors.generic");
}
