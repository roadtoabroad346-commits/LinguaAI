import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/smart-path",
  "/guided-path",
  "/my-path",
  "/profile",
  "/progress",
  "/onboarding",
  "/daily-challenge",
  "/vocabulary",
  "/dictionary",
  "/flashcards",
  "/vocab-sets",
  "/grammar",
  "/reading",
  "/listening",
  "/pronunciation",
  "/speaking",
  "/writing",
  "/spelling",
  "/ai-teacher",
];

const AUTH_PAGES = ["/login", "/signup", "/forgot-password"];

function isProtected(pathname: string): boolean {
  if (pathname === "/placement") return false; // deliberate guest preview mode
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  if (!userId && isProtected(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (userId && isAuthPage(pathname)) {
    const next = request.nextUrl.searchParams.get("next");
    // Same policy as lib/auth/routing sanitizeNext: no protocol-relative,
    // backslash, control chars, or auth-loop destinations.
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
    const dest = request.nextUrl.clone();
    dest.pathname = safe.split("?")[0] ?? "/dashboard";
    const q = safe.includes("?") ? safe.slice(safe.indexOf("?") + 1) : "";
    dest.search = q ? `?${q}` : "";
    return NextResponse.redirect(dest);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)"],
};
