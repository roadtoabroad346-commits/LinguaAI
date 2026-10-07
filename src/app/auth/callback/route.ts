import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSiteUrl } from "@/lib/env";

function siteUrl(request: NextRequest): string {
  return getSiteUrl(request.nextUrl.origin);
}

/** OAuth / magic-link callback: exchanges `code` for a session, then routes by onboarding state. */
export async function GET(request: NextRequest) {
  const url = siteUrl(request);
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return NextResponse.redirect(new URL("/login?error=not_configured", url));
  }

  const response = NextResponse.redirect(new URL(next, url));
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_failed", url));
  }

  // Ensure a profile row exists for Google sign-ins (email signups get one via trigger/signup route).
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (user) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
      } as never,
      { onConflict: "id", ignoreDuplicates: false }
    );
    // Route users who already finished onboarding straight to the dashboard.
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed,preferred_language")
      .eq("id", user.id)
      .maybeSingle();
    const p = profile as { onboarding_completed?: boolean; preferred_language?: string } | null;
    // Language sync on login — priority: user setting → local preference → browser.
    const cookieLang = request.cookies.get("linguaai_locale")?.value;
    const isSupported = (v: unknown): v is "kk" | "ru" | "en" => v === "kk" || v === "ru" || v === "en";
    if (isSupported(p?.preferred_language)) {
      response.cookies.set("linguaai_locale", p.preferred_language, {
        path: "/",
        maxAge: 31536000,
        sameSite: "lax",
      });
    } else if (isSupported(cookieLang)) {
      await supabase.from("profiles").update({ preferred_language: cookieLang } as never).eq("id", user.id);
    }
    if (p?.onboarding_completed) {
      const dash = NextResponse.redirect(new URL("/dashboard", url));
      // Carry over any locale cookie set above.
      const setLocale = response.cookies.get("linguaai_locale");
      if (setLocale) dash.cookies.set("linguaai_locale", setLocale.value, { path: "/", maxAge: 31536000, sameSite: "lax" });
      return dash;
    }
  }

  return response;
}
