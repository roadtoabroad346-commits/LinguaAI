import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSiteUrl } from "@/lib/env";

/** Signs the user out (accepts GET for link-based sign-out and POST for forms). */
export async function POST(request: NextRequest) {
  return signOut(request);
}

export async function GET(request: NextRequest) {
  return signOut(request);
}

async function signOut(request: NextRequest) {
  const url = getSiteUrl(request.nextUrl.origin);
  const response = NextResponse.redirect(new URL("/login?signed_out=1", url));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) return response;
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
  await supabase.auth.signOut();
  return response;
}
