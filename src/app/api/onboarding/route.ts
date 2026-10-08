import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/auth/schemas";

export const dynamic = "force-dynamic";

/** Completes onboarding: validates input, writes atomically, marks it complete. */
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

  // Prefer the atomic RPC (0014); fall back to a direct upsert on older backends.
  try {
    const { error: rpcError } = await supabase.rpc("complete_onboarding", {
      payload: {
        displayName: d.displayName,
        nativeLanguage: d.nativeLanguage,
        goals: d.goals,
        dailyGoalXp: d.dailyGoalXp,
        learningMode: d.learningMode,
        preferredLanguage: d.preferredLanguage ?? "en",
        onboardingStep: d.onboardingStep ?? 0,
      },
    } as never);
    if (!rpcError) {
      // Persist the extended personalization columns the RPC does not own yet.
      const patch: Record<string, unknown> = {};
      if (d.targetExam !== undefined) patch.target_exam = d.targetExam || null;
      if (d.targetScore !== undefined) patch.target_score = d.targetScore || null;
      if (d.targetDate !== undefined) patch.target_date = d.targetDate || null;
      if (d.dailyGoalMinutes !== undefined) patch.daily_goal_minutes = d.dailyGoalMinutes ?? null;
      if (d.prioritySkills !== undefined) patch.priority_skills = d.prioritySkills;
      if (d.interests !== undefined) patch.interests = d.interests;
      if (d.studyTimePreference !== undefined) patch.study_time_preference = d.studyTimePreference || null;
      if (d.obstacles !== undefined) patch.obstacles = d.obstacles;
      if (Object.keys(patch).length > 0) {
        await supabase.from("profiles").update(patch as never).eq("id", user.id);
      }
      const res = NextResponse.json({ ok: true, next: "/placement" });
      res.headers.set("Cache-Control", "no-store");
      return res;
    }
  } catch {
    /* fall through to direct upsert */
  }

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
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: d.onboardingStep ?? 0,
      target_exam: d.targetExam || null,
      target_score: d.targetScore || null,
      target_date: d.targetDate || null,
      daily_goal_minutes: d.dailyGoalMinutes ?? null,
      priority_skills: d.prioritySkills ?? [],
      interests: d.interests ?? [],
      study_time_preference: d.studyTimePreference || null,
      obstacles: d.obstacles ?? [],
    } as never,
    { onConflict: "id" }
  );
  if (error) {
    // Backend predates 0013 (new columns missing): retry with the legacy column set
    // so onboarding still completes; extended fields sync after the migration is applied.
    if (isMissingColumnError(error.message)) {
      const { error: legacyError } = await supabase.from("profiles").upsert(
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
      if (!legacyError) {
        const res = NextResponse.json({ ok: true, next: "/placement", migrated: false });
        res.headers.set("Cache-Control", "no-store");
        return res;
      }
    }
    return NextResponse.json({ error: "Could not save onboarding. Try again." }, { status: 500 });
  }
  const res = NextResponse.json({ ok: true, next: "/placement" });
  res.headers.set("Cache-Control", "no-store");
  return res;
}

function isMissingColumnError(message: string): boolean {
  return /column|schema cache|0013/i.test(message);
}
