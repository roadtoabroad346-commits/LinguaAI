import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";

export type SessionUser = { id: string; email: string | null };

/** Returns the signed-in user, or null (never throws when Supabase is unconfigured). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return null;
    return { id: u.id, email: u.email ?? null };
  } catch {
    return null;
  }
});

/** Returns the caller's profile row, or null if signed out / missing / unconfigured. */
export const getSessionProfile = cache(async (): Promise<ProfileRow | null> => {
  try {
    const user = await getSessionUser();
    if (!user) return null;
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    return (data as ProfileRow | null) ?? null;
  } catch {
    return null;
  }
});

/**
 * Single server source of truth: validated user (via getUser, never getSession
 * alone) plus their profile row. Cached per request. Use in every server
 * component and API route that needs identity.
 */
export const getCurrentUser = cache(
  async (): Promise<{ user: SessionUser; profile: ProfileRow | null } | null> => {
    const user = await getSessionUser();
    if (!user) return null;
    const profile = await getSessionProfile();
    return { user, profile };
  }
);

/** True when onboarding is incomplete and the user should be guided to /onboarding. */
export function needsOnboarding(profile: ProfileRow | null): boolean {
  if (!profile) return false; // signed out — login gate handles it
  return !profile.onboarding_completed;
}
