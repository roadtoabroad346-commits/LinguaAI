import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isSupabaseUrlValid } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Authenticated-only diagnostics: what the server sees for this caller.
 * User id is truncated to a suffix — never full PII in logs.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        signedIn: false,
        reason: !isSupabaseUrlValid(process.env.NEXT_PUBLIC_SUPABASE_URL)
          ? "supabase_url_invalid_or_missing"
          : "supabase_keys_missing",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ signedIn: false }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ signedIn: false }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed,placement_completed,level,onboarding_step")
    .eq("id", user.id)
    .maybeSingle();
  const p = (profile ?? {}) as {
    onboarding_completed?: boolean;
    placement_completed?: boolean;
    level?: string | null;
    onboarding_step?: number | null;
  };
  return NextResponse.json(
    {
      signedIn: true,
      userIdSuffix: user.id.slice(-6),
      profileExists: profile !== null,
      onboardingCompleted: p.onboarding_completed === true,
      onboardingStep: p.onboarding_step ?? 0,
      placementCompleted:
        p.placement_completed === true || (typeof p.level === "string" && p.level.length > 0),
      level: p.level ?? null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
