import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSiteUrl } from "@/lib/env";
import { resolveNextPath, sanitizeNext } from "@/lib/auth/routing";

/** Build the public origin correctly on Vercel (forwarded host/proto aware). */
function siteUrl(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
    try {
      return new URL(`${proto}://${forwardedHost}`).toString().replace(/\/+$/, "");
    } catch {
      /* fall through */
    }
  }
  return getSiteUrl(request.nextUrl.origin);
}

/**
 * OAuth / magic-link / email-confirmation callback.
 * Exchanges `code` for a session, attaches cookies to the actual redirect
 * response, then routes by onboarding/placement state (never blindly).
 */
export async function GET(request: NextRequest) {
  const origin = siteUrl(request);
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const error = params.get("error");
  const errorDescription = params.get("error_description");
  const requestedNext = sanitizeNext(params.get("next"), "/onboarding");

  if (error) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "oauth_failed");
    if (errorDescription) login.searchParams.set("detail", errorDescription.slice(0, 200));
    return NextResponse.redirect(login);
  }

  if (!code) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "missing_code");
    return NextResponse.redirect(login);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "not_configured");
    return NextResponse.redirect(login);
  }

  // The redirect response that will carry the session cookies.
  const response = NextResponse.redirect(new URL(requestedNext, origin));
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options: unknown }>) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
        );
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    // Structured server log without secrets.
    console.error("[auth/callback] exchange failed", { message: exchangeError.message });
    const login = new URL("/login", origin);
    login.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(login);
  }

  // Ensure a profile row exists (Google sign-ins especially).
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    const login = new URL("/login", origin);
    login.searchParams.set("error", "oauth_failed");
    // Preserve any freshly set cookies on this redirect too.
    for (const c of response.cookies.getAll()) login.searchParams.set(`_c_${c.name}`, "1");
    return NextResponse.redirect(login);
  }

  try {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
      } as never,
      { onConflict: "id", ignoreDuplicates: false }
    );
  } catch {
    /* non-fatal: trigger/backfill covers missing rows */
  }

  // Language sync: profile setting wins, else adopt the local cookie.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed,placement_completed,level,preferred_language")
    .eq("id", user.id)
    .maybeSingle();
  const p = profile as {
    onboarding_completed?: boolean;
    placement_completed?: boolean;
    level?: string | null;
    preferred_language?: string;
  } | null;
  const cookieLang = request.cookies.get("linguaai_locale")?.value;
  const isSupported = (v: unknown): v is "kk" | "ru" | "en" => v === "kk" || v === "ru" || v === "en";
  if (isSupported(p?.preferred_language)) {
    response.cookies.set("linguaai_locale", p.preferred_language, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
    });
  } else if (isSupported(cookieLang)) {
    try {
      await supabase.from("profiles").update({ preferred_language: cookieLang } as never).eq("id", user.id);
    } catch {
      /* noop */
    }
  }

  // Decide destination on the server — never blindly /onboarding.
  const destination = resolveNextPath(p, requestedNext);
  if (destination !== requestedNext) {
    const final = NextResponse.redirect(new URL(destination, origin));
    // Carry session + locale cookies onto the final redirect (the old code dropped them).
    for (const c of response.cookies.getAll()) {
      final.cookies.set(c.name, c.value);
    }
    return final;
  }
  return response;
}
