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
 */
export async function updateSession(request: NextRequest): Promise<SessionRefreshResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const passthrough = NextResponse.next({ request });
  if (!url || !anon) return { response: passthrough, userId: null };
  const response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options: unknown }>) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        );
      }
    }
  });
  try {
    const { data } = await supabase.auth.getUser();
    return { response, userId: data.user?.id ?? null };
  } catch {
    return { response, userId: null };
  }
}
