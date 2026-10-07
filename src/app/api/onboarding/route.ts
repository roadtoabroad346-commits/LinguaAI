import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/auth/schemas";

/** Completes onboarding: validates input, upserts the profile, marks it complete. */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const user = userData.user;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid onboarding data.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: d.displayName,
      native_language: d.nativeLanguage,
      goals: d.goals,
      daily_goal_xp: d.dailyGoalXp,
      learning_mode: d.learningMode,
      preferred_language: d.preferredLanguage ?? "en",
      onboarding_completed: true,
    } as never,
    { onConflict: "id" }
  );
  if (error) {
    return NextResponse.json({ error: "Could not save onboarding. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, next: "/placement" });
}
