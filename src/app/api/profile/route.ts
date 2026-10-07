import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/auth/schemas";

/** Returns the caller's profile. */
export async function GET() {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  return NextResponse.json({ profile: data });
}

/** Partial profile update (display name, goals, daily goal, learning mode). */
export async function PATCH(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid profile data.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const d = parsed.data;
  const patch: Record<string, unknown> = {};
  if (d.displayName !== undefined) patch.display_name = d.displayName;
  if (d.nativeLanguage !== undefined) patch.native_language = d.nativeLanguage;
  if (d.goals !== undefined) patch.goals = d.goals;
  if (d.dailyGoalXp !== undefined) patch.daily_goal_xp = d.dailyGoalXp;
  if (d.learningMode !== undefined) patch.learning_mode = d.learningMode;
  if (d.preferredLanguage !== undefined) patch.preferred_language = d.preferredLanguage;
  if (d.timezone !== undefined) patch.timezone = d.timezone;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", userData.user.id);
  if (error) return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
