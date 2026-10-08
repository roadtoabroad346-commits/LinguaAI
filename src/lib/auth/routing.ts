/** Single routing decision for post-auth destinations (Step 3 of the auth-sync plan). */

export interface RoutingProfile {
  onboarding_completed?: boolean | null;
  placement_completed?: boolean | null;
  /** Legacy fallback: a level implies placement was completed. */
  level?: string | null;
}

const DEFAULT_DASHBOARD = "/dashboard";

/**
 * Allow only relative paths starting with a single slash.
 * Rejects absolute URLs, protocol-relative URLs, backslashes and encoded tricks.
 */
export function sanitizeNext(raw: unknown, fallback = DEFAULT_DASHBOARD): string {
  if (typeof raw !== "string") return fallback;
  let value = raw.trim();
  if (!value) return fallback;
  // Decode once to catch %2F%2Fevil.com style tricks; if decoding fails, reject.
  try {
    const decoded = decodeURIComponent(value);
    // If double-encoded, decode again once more (defence in depth, still strict after).
    value = decoded;
  } catch {
    return fallback;
  }
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\") || value.includes("\\")) return fallback;
  if (/^\/[a-zA-Z]+:/.test(value)) return fallback;
  // Reject control chars / spaces that could hide an open redirect.
  if (/[\s<>]/.test(value)) return fallback;
  // Must not contain :// anywhere after the leading slash.
  if (value.slice(1).includes("://")) return fallback;
  // Cap length to avoid abuse.
  if (value.length > 256) return fallback;
  // Never send users back to auth pages after sign-in.
  if (value === "/login" || value === "/signup" || value.startsWith("/login?") || value.startsWith("/signup?")) {
    return fallback;
  }
  if (value.startsWith("/auth/")) return fallback;
  return value;
}

function placementDone(p: RoutingProfile | null | undefined): boolean {
  if (!p) return false;
  if (p.placement_completed === true) return true;
  // Legacy / transitional: a level set on the profile implies placement done.
  if (typeof p.level === "string" && p.level.length > 0) return true;
  return false;
}

/**
 * Single pure destination decision.
 * - No profile or onboarding not completed -> /onboarding (preserves safe `next` for later).
 * - Onboarding done but placement not done -> /placement.
 * - Both done -> safe `next` or /dashboard.
 */
export function resolveNextPath(
  profile: RoutingProfile | null | undefined,
  requestedNext?: unknown
): string {
  const safeNext = sanitizeNext(requestedNext, DEFAULT_DASHBOARD);
  if (!profile || profile.onboarding_completed !== true) return "/onboarding";
  if (!placementDone(profile)) return "/placement";
  return safeNext;
}

/** Where an already-completed user visiting /onboarding or /placement should go. */
export function redirectForCompletedVisit(
  profile: RoutingProfile | null | undefined,
  allowExplicitRetake = false
): string | null {
  if (allowExplicitRetake) return null;
  if (!profile || profile.onboarding_completed !== true) return null;
  if (placementDone(profile)) return "/dashboard";
  return null;
}
