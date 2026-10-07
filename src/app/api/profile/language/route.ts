import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { LOCALE_COOKIE } from "@/lib/i18n/config";

const bodySchema = z.object({
  preferredLanguage: z.enum(["kk", "ru", "en"]),
});

/**
 * PATCH /api/profile/language — persist the interface language.
 * Always sets the locale cookie (works logged-out too); syncs to the
 * Supabase profile when authenticated. Missing `preferred_language`
 * column (pre-migration DBs) is tolerated: cookie still persists locally.
 */
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid language." }, { status: 400 });
  }
  const { preferredLanguage } = parsed.data;

  const res = NextResponse.json({ ok: true, preferredLanguage });
  res.cookies.set(LOCALE_COOKIE, preferredLanguage, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ preferred_language: preferredLanguage } as never)
        .eq("id", data.user.id);
    }
  } catch {
    /* logged-out or unconfigured backend — cookie is the fallback */
  }
  return res;
}
