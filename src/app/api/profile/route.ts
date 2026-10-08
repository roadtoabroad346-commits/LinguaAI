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
  const res = NextResponse.json({ profile: data });
  res.headers.set("Cache-Control", "no-store");
  return res;
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
  if (d.onboardingStep !== undefined) patch.onboarding_step = d.onboardingStep;
  if (d.targetExam !== undefined) patch.target_exam = d.targetExam || null;
  if (d.targetScore !== undefined) patch.target_score = d.targetScore || null;
  if (d.targetDate !== undefined) patch.target_date = d.targetDate || null;
  if (d.dailyGoalMinutes !== undefined) patch.daily_goal_minutes = d.dailyGoalMinutes ?? null;
  if (d.prioritySkills !== undefined) patch.priority_skills = d.prioritySkills;
  if (d.interests !== undefined) patch.interests = d.interests;
  if (d.studyTimePreference !== undefined) patch.study_time_preference = d.studyTimePreference || null;
  if (d.obstacles !== undefined) patch.obstacles = d.obstacles;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await supabase
    .from("profiles")
    .update(patch as never)
    .eq("id", userData.user.id);
  if (error) {
    // Backend predates 0013: retry with legacy columns only (extended fields sync later).
    if (/column|schema cache|0013/i.test(error.message)) {
      const legacy: Record<string, unknown> = {};
      for (const k of [
        "display_name",
        "native_language",
        "goals",
        "daily_goal_xp",
        "learning_mode",
        "preferred_language",
        "timezone",
      ]) {
        if (patch[k] !== undefined) legacy[k] = patch[k];
      }
      if (Object.keys(legacy).length > 0) {
        const { error: legacyError } = await supabase
          .from("profiles")
          .update(legacy as never)
          .eq("id", userData.user.id);
        if (!legacyError) {
          const res = NextResponse.json({ ok: true, migrated: false });
          res.headers.set("Cache-Control", "no-store");
          return res;
        }
      }
    }
    return NextResponse.json({ error: "Could not save profile." }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
