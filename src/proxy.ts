import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/env";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/smart-path",
  "/guided-path",
  "/my-path",
  "/profile",
  "/progress",
  "/onboarding",
  "/daily-challenge",
  "/dictionary",
  "/flashcards",
  "/vocab-sets",
  "/speaking",
  "/writing",
  "/spelling",
  "/ai-teacher",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const pathname = request.nextUrl.pathname;
  const configured = isSupabaseConfigured();

  // Preview mode intentionally exposes deterministic, non-persisted learning
  // screens. Real user data routes remain protected when Supabase is present.
  if (configured && !userId && isProtected(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (configured && userId && isAuthPage(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    const safe =
      next &&
      next.startsWith("/") &&
      !next.startsWith("//") &&
      !next.startsWith("/\\") &&
      !next.includes("\\") &&
      !next.includes("://") &&
      !next.startsWith("/auth/") &&
      next !== "/login" &&
      !next.startsWith("/login?") &&
      next !== "/signup" &&
      !next.startsWith("/signup?") &&
      next.length <= 256
        ? next
        : "/dashboard";
    const destination = request.nextUrl.clone();
    destination.pathname = safe.split("?")[0] ?? "/dashboard";
    const query = safe.includes("?") ? safe.slice(safe.indexOf("?") + 1) : "";
    destination.search = query ? `?${query}` : "";
    return NextResponse.redirect(destination);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)"],
};
