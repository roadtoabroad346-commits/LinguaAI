import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/api/security";
import { getSessionProfile } from "@/lib/auth/session";
import { resolveNextPath } from "@/lib/auth/routing";
import { createGuestSession, ensureGuestProfile } from "@/lib/auth/guest";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/guest — enter as a guest, no registration.
 *
 * Creates a real (anonymous / managed) Supabase session so the guest can use
 * every feature. Idempotent: an already-signed-in visitor just gets their
 * destination, so repeated clicks during a demo never rotate identities.
 *
 * Response: { ok: true, next, reuse, mode } — `next` is the routing decision
 * (onboarding → placement → requested/dashboard), mirroring password auth.
 */
export async function POST(request: Request) {
  // Hard limit: demo traffic is bursts of clicks, not sustained growth.
  const limited = await checkRateLimit(request, { key: "guest-login", limit: 10 });
  if (limited) return limited;

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json(
      { error: "Supabase is not configured.", code: "supabase_missing" },
      { status: 503 }
    );
  }

  // Already signed in (guest or full account): reuse the session.
  try {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const profile = await getSessionProfile().catch(() => null);
      const res = NextResponse.json({
        ok: true,
        reuse: true,
        mode: data.user.is_anonymous === true ? "anonymous" : "existing",
        next: resolveNextPath(profile),
      });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  } catch {
    /* not signed-in — continue to guest creation */
  }

  const guest = await createGuestSession();
  if (!guest.ok) {
    const res = NextResponse.json(
      { error: "Guest sign-in is temporarily unavailable. Please retry.", code: guest.code },
      { status: guest.code === "unconfigured" ? 503 : 500 }
    );
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // Make sure onboarding finds a profile row even without the DB trigger.
  await ensureGuestProfile().catch(() => {});

  const profile = await getSessionProfile().catch(() => null);
  const res = NextResponse.json({
    ok: true,
    reuse: false,
    mode: guest.mode,
    next: resolveNextPath(profile),
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
