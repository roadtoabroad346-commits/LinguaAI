import "server-only";
import { randomUUID, randomBytes } from "node:crypto";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Guest access ("demo mode").
 *
 * Goal: a jury member or investor lands on the site, clicks one button and gets
 * a REAL Supabase session — no registration, no email, full feature access.
 * Because the guest owns a real auth user + profile row, every existing API
 * route, RLS policy and page guard works unchanged.
 *
 * Two paths (best first, automatic fallback):
 * 1. signInAnonymously — native Supabase anonymous sign-in. Clean (no stored
 *    password). Requires "Allow anonymous sign-ins" in the Supabase dashboard.
 * 2. Admin-created guest — service role creates an email-confirmed user with
 *    random credentials under a reserved domain, then the anon-key server
 *    client signs in with those credentials so the session cookies live in
 *    the same cookie store the rest of the app reads. Works whenever the
 *    service-role key is configured — no dashboard toggle needed.
 *
 * Security notes:
 * - Guest emails use the reserved "guest.linguaai.local" domain and random
 *   credentials; they cannot receive mail and nobody can sign in to them
 *   except the creator request itself.
 * - The service-role key never reaches the client and the guest password is
 *   never returned or logged.
 * - Everything is additionally protected by the route's IP rate limit.
 */

export type GuestSessionResult =
  | { ok: true; mode: "anonymous" | "managed"; userId: string | null }
  | { ok: false; code: "unconfigured" | "admin_unavailable" | "auth_failed"; message: string };

const GUEST_EMAIL_DOMAIN = "guest.linguaai.local";
const GUEST_DISPLAY_NAME = "Guest";

function randomGuestCredentials(): { email: string; password: string } {
  const password = `Gx${randomBytes(16).toString("base64url")}!a${Date.now().toString(36)}`;
  const email = `guest-${randomUUID()}@${GUEST_EMAIL_DOMAIN}`;
  return { email, password };
}

function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Path 1 — native anonymous sign-in. Sets session cookies directly through the
 * SSR client, so this is the cheapest and cleanest path when the provider is
 * enabled in the Supabase project.
 */
async function tryAnonymous(): Promise<GuestSessionResult> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data.user) return { ok: true, mode: "anonymous", userId: data.user.id };
    // anonymous_provider_disabled is the expected miss on most projects.
    return { ok: false, code: "auth_failed", message: error?.message ?? "anonymous sign-in failed" };
  } catch {
    return { ok: false, code: "auth_failed", message: "anonymous sign-in unavailable" };
  }
}

/**
 * Path 2 — service-role guest. Creates the user via the admin API, then signs
 * in on the anon SSR client (session cookies land in the normal cookie store).
 * One retry with fresh credentials guards against rare transient errors.
 */
async function tryManagedGuest(): Promise<GuestSessionResult> {
  if (!hasServiceRoleKey()) {
    return { ok: false, code: "unconfigured", message: "SUPABASE_SERVICE_ROLE_KEY is not set" };
  }
  try {
    const admin = createRawClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    for (let attempt = 0; attempt < 2; attempt++) {
      const { email, password } = randomGuestCredentials();
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: GUEST_DISPLAY_NAME, guest: true },
      });
      if (error || !data.user) {
        if (attempt === 1) {
          return { ok: false, code: "admin_unavailable", message: error?.message ?? "guest user creation failed" };
        }
        continue;
      }
      // Sign in on the cookie-backed SSR client so middleware, server
      // components and API routes all see the same fresh session.
      const supabase = createClient();
      const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (!signInError && signIn.user) {
        return { ok: true, mode: "managed", userId: signIn.user.id };
      }
      if (attempt === 1) {
        return { ok: false, code: "auth_failed", message: signInError?.message ?? "guest sign-in failed" };
      }
    }
    return { ok: false, code: "auth_failed", message: "guest sign-in failed" };
  } catch {
    return { ok: false, code: "admin_unavailable", message: "guest provisioning unavailable" };
  }
}

/** Creates a guest session through the best available path. Never returns PII. */
export async function createGuestSession(): Promise<GuestSessionResult> {
  const anon = await tryAnonymous();
  if (anon.ok) return anon;
  return tryManagedGuest();
}

/**
 * Best-effort profile bootstrap. The on_auth_user_created trigger normally
 * creates the row; this covers projects where the trigger has not been
 * installed yet (same safety net the signup flow uses). Never throws.
 */
export async function ensureGuestProfile(displayName: string = GUEST_DISPLAY_NAME): Promise<void> {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        display_name: displayName,
      } as never,
      { onConflict: "id", ignoreDuplicates: true }
    );
  } catch {
    /* best-effort — the trigger or a later request can still create the row */
  }
}
