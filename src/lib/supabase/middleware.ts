import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export interface SessionRefreshResult {
  response: NextResponse;
  userId: string | null;
}

/**
 * Refreshes the cookie-based session on every matched request (getUser
 * validates against Supabase Auth and rotates cookies when needed) and
 * reports the user id so the caller can enforce optimistic route protection.
 * Never throws when Supabase is unconfigured — returns an anonymous pass-through.
 *
 * Critical: refreshed cookies are ALSO forwarded into the downstream request
 * headers, so Server Components / API routes in the same request validate
 * against the SAME fresh session. Without this, a request arriving with an
 * expired access token passed middleware (which refreshed it) but the page
 * guard still saw the stale cookies → false redirect to /login (kick loop).
 */
export async function updateSession(request: NextRequest): Promise<SessionRefreshResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const passthrough = NextResponse.next({ request });
  if (!url || !anon) return { response: passthrough, userId: null };
  let response = NextResponse.next({ request });
  const rotated: Array<{ name: string; value: string; options: unknown }> = [];
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options: unknown }>) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          rotated.push({ name, value, options });
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      }
    }
  });
  let userId: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }
  if (rotated.length > 0) {
    // Merge refreshed cookies over the incoming ones for downstream readers.
    // (Supabase cookie values are base64url JSON — no cookie-unsafe chars.)
    const merged = new Map<string, string>();
    for (const c of request.cookies.getAll()) merged.set(c.name, c.value);
    for (const c of rotated) {
      if (c.value) merged.set(c.name, c.value);
      else merged.delete(c.name);
    }
    const headers = new Headers(request.headers);
    const pairs: string[] = [];
    merged.forEach((v, k) => {
      pairs.push(`${k}=${v}`);
    });
    headers.set("cookie", pairs.join("; "));
    response = NextResponse.next({ request: { headers } });
    for (const c of rotated) {
      response.cookies.set(c.name, c.value, c.options as Parameters<typeof response.cookies.set>[2]);
    }
  }
  return { response, userId };
}
