import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placementSubmitSchema } from "@/lib/auth/schemas";
import { gradePlacement } from "@/lib/placement/scoring";

/**
 * Grades the placement test deterministically (no AI) and persists the result.
 * Works account-free for preview: without a session it returns the grade without saving.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = placementSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid answers.", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const grade = gradePlacement(parsed.data.answers);

  let supabase;
  try {
    supabase = createClient();
  } catch {
    // Backend unconfigured: still return the deterministic grade for preview.
    return NextResponse.json({ ...grade, saved: false });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ ...grade, saved: false });
  }

  const { error: resultError } = await supabase.from("placement_results").insert({
    user_id: user.id,
    score: grade.score,
    total: grade.total,
    level: grade.level,
    answers: grade.answers,
  } as never);
  if (resultError) {
    return NextResponse.json({ error: "Could not save placement result." }, { status: 500 });
  }

  const profilePatch: Record<string, unknown> = {
    level: grade.level,
    placement_score: grade.percent,
    placement_taken_at: new Date().toISOString(),
  };
  if (parsed.data.learningMode) profilePatch.learning_mode = parsed.data.learningMode;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profilePatch as never)
    .eq("id", user.id);
  if (profileError) {
    return NextResponse.json({ error: "Result saved, but profile update failed." }, { status: 500 });
  }

  return NextResponse.json({ ...grade, saved: true });
}
