import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSiteUrl } from "@/lib/env";
import { resolveNextPath, sanitizeNext } from "@/lib/auth/routing";
import {
  getNetworkContext,
  isCountryChange,
  logSecurityEvent,
} from "@/lib/security/telemetry";

/** Build the public origin correctly on Vercel (forwarded host/proto aware).
 * The forwarded host is allowlisted (app URL / Vercel hosts only) so a
 * spoofed Host header cannot turn the post-auth redirect into an open
 * redirect to an attacker origin. */
function siteUrl(request: NextRequest): string {
  const fallback = getSiteUrl(request.nextUrl.origin);
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(fallback).host.toLowerCase());
  } catch {
    /* ignore */
  }
  try {
    allowed.add(request.nextUrl.host.toLowerCase());
  } catch {
    /* ignore */
  }
  if (process.env.VERCEL_URL) {
    allowed.add(process.env.VERCEL_URL.toLowerCase().replace(/\/+$/, ""));
  }
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim().toLowerCase();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const hostOnly = forwardedHost.split(":")[0];
    const trusted =
      allowed.has(forwardedHost) ||
      allowed.has(hostOnly) ||
      hostOnly.endsWith(".vercel.app") ||
      hostOnly === "localhost" ||
      hostOnly === "127.0.0.1";
    if (trusted) {
      const proto = forwardedProto === "http" || forwardedProto === "https" ? forwardedProto : "https";
      try {
        return new URL(`${proto}://${forwardedHost}`).toString().replace(/\/+$/, "");
      } catch {
        /* fall through */
      }
    }
  }
  return fallback;
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
  const requestedNext = sanitizeNext(params.get("next"), "/dashboard");
  // Password recovery must never be gated by onboarding/placement:
  // the user needs to reach /reset-password even with an incomplete profile.
  const isRecovery = requestedNext === "/reset-password" || requestedNext.startsWith("/reset-password?");

  if (error) {
    const dest = new URL(isRecovery ? "/forgot-password" : "/login", origin);
    if (!isRecovery) dest.searchParams.set("error", "oauth_failed");
    if (errorDescription) dest.searchParams.set("detail", errorDescription.slice(0, 200));
    return NextResponse.redirect(dest);
  }

  if (!code) {
    const dest = new URL(isRecovery ? "/forgot-password" : "/login", origin);
    if (!isRecovery) dest.searchParams.set("error", "missing_code");
    return NextResponse.redirect(dest);
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
  const carried: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet: Array<{ name: string; value: string; options: unknown }>) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          carried.push({ name, value, options: (options ?? {}) as Record<string, unknown> });
          response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
        });
      },
    },
  });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    // Structured server log without secrets.
    console.error("[auth/callback] exchange failed", { message: exchangeError.message });
    const dest = new URL(isRecovery ? "/forgot-password" : "/login", origin);
    if (!isRecovery) dest.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(dest);
  }

  // Ensure a profile row exists (Google sign-ins especially).
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    const dest = new URL("/login", origin);
    dest.searchParams.set("error", "oauth_failed");
    const login = NextResponse.redirect(dest);
    // Keep any freshly set session cookies: getUser() can transiently miss
    // (cookie rotation mid-request) while the session itself is valid.
    for (const c of carried) {
      login.cookies.set(c.name, c.value, c.options as Parameters<typeof login.cookies.set>[2]);
    }
    return login;
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
  let localeToCarry: "kk" | "ru" | "en" | null = null;
  if (isSupported(p?.preferred_language)) {
    localeToCarry = p.preferred_language;
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
  // Recovery always lands on /reset-password (no onboarding gate).
  // Security telemetry: best-effort login event + anomaly flags. Never fatal.
  try {
    const net = getNetworkContext(request);
    const { data: lastLogin } = await supabase
      .from("security_events")
      .select("country")
      .eq("user_id", user.id)
      .eq("event_type", "login")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastCountry = (lastLogin as { country?: string | null } | null)?.country ?? null;
    const { data: sharedCount } = await supabase.rpc("check_shared_ip", { p_ip: net.ip } as never);
    const newCountry = isCountryChange(lastCountry, net.country);
    const sharedIp = typeof sharedCount === "number" && sharedCount >= 2;
    await logSecurityEvent(supabase, {
      userId: user.id,
      type: "login",
      net,
      meta: {
        provider: (user.app_metadata?.provider as string | undefined) ?? "unknown",
        isRecovery,
        newCountry,
        sharedIp,
      },
    });
    if (newCountry) {
      await logSecurityEvent(supabase, {
        userId: user.id,
        type: "country_change",
        net,
        meta: { from: lastCountry, to: net.country },
      });
    }
    if (sharedIp) {
      await logSecurityEvent(supabase, {
        userId: user.id,
        type: "shared_ip",
        net,
        meta: { distinctUsersLastHour: sharedCount },
      });
    }
  } catch {
    /* telemetry must never break login */
  }
  const destination = isRecovery ? "/reset-password" : resolveNextPath(p, requestedNext);
  if (destination !== requestedNext) {
    const final = NextResponse.redirect(new URL(destination, origin));
    // Carry session + locale cookies onto the final redirect WITH attributes
    // (httpOnly/secure/sameSite/maxAge/path) — dropping them logged users out.
    for (const c of carried) {
      final.cookies.set(c.name, c.value, c.options as Parameters<typeof final.cookies.set>[2]);
    }
    if (localeToCarry) {
      final.cookies.set("linguaai_locale", localeToCarry, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    }
    return final;
  }
  return response;
}
