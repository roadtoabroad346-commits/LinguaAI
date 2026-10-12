import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placementSubmitSchema } from "@/lib/auth/schemas";
import { gradePlacement } from "@/lib/placement/scoring";

export const dynamic = "force-dynamic";

/**
 * Grades the placement test deterministically (no AI) and persists the result.
 * Works account-free for preview: without a session it returns the grade without saving.
 * Authenticated writes go through the atomic save_placement_result RPC (0014)
 * with a legacy insert+update fallback for backends that predate it.
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
  const noStore = { "Cache-Control": "no-store" };

  let supabase;
  try {
    supabase = createClient();
  } catch {
    // Backend unconfigured: still return the deterministic grade for preview.
    return NextResponse.json({ ...grade, saved: false }, { headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ ...grade, saved: false }, { headers: noStore });
  }

  // Atomic path: one transaction inserts history + syncs the profile.
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc("save_placement_result", {
      payload: {
        score: grade.score,
        total: grade.total,
        level: grade.level,
        answers: grade.answers,
        skillScores: grade.perBand ?? {},
        learningMode: parsed.data.learningMode,
        durationSeconds: parsed.data.durationSeconds,
        testVersion: parsed.data.testVersion ?? "v2",
      },
    } as never);
    if (!rpcError) {
      return NextResponse.json(
        { ...grade, saved: true, receipt: rpcData ?? null },
        { headers: noStore }
      );
    }
  } catch {
    /* fall through to legacy write */
  }

  const { error: resultError } = await supabase.from("placement_results").insert({
    user_id: user.id,
    score: grade.score,
    total: grade.total,
    level: grade.level,
    answers: grade.answers,
  } as never);
  if (resultError) {
    return NextResponse.json({ error: "Could not save placement result." }, { status: 500, headers: noStore });
  }

  const profilePatch: Record<string, unknown> = {
    level: grade.level,
    level_source: "placement",
    placement_completed: true,
    placement_completed_at: new Date().toISOString(),
    placement_score: grade.percent,
    placement_taken_at: new Date().toISOString(),
  };
  if (parsed.data.learningMode) profilePatch.learning_mode = parsed.data.learningMode;

  const { error: profileError } = await supabase
    .from("profiles")
    .update(profilePatch as never)
    .eq("id", user.id);
  if (profileError) {
    // Backend predates 0013: retry with legacy columns so the level is still saved.
    if (/column|schema cache|0013/i.test(profileError.message)) {
      const legacyPatch: Record<string, unknown> = {
        level: grade.level,
        placement_score: grade.percent,
        placement_taken_at: new Date().toISOString(),
      };
      if (parsed.data.learningMode) legacyPatch.learning_mode = parsed.data.learningMode;
      const { error: legacyError } = await supabase
        .from("profiles")
        .update(legacyPatch as never)
        .eq("id", user.id);
      if (!legacyError) {
        return NextResponse.json({ ...grade, saved: true, migrated: false }, { headers: noStore });
      }
    }
    // History row is saved — verify whether the profile actually got the level
    // (the 0016 trigger syncs it even when the update above fails). Never lose
    // the graded result: return 200 with an explicit sync flag so the client
    // shows the level instead of a dead-end error.
    const { data: verify } = await supabase
      .from("profiles")
      .select("level")
      .eq("id", user.id)
      .maybeSingle();
    const synced =
      (verify as { level?: string | null } | null)?.level === grade.level;
    if (synced) {
      return NextResponse.json({ ...grade, saved: true }, { headers: noStore });
    }
    // One repair attempt with the minimal patch before admitting failure.
    const { error: repairError } = await supabase
      .from("profiles")
      .update({ level: grade.level } as never)
      .eq("id", user.id);
    if (!repairError) {
      return NextResponse.json({ ...grade, saved: true, repaired: true }, { headers: noStore });
    }
    return NextResponse.json(
      {
        ...grade,
        saved: true,
        profileSynced: false,
        warning: "Result saved, but level sync needs a retry. Re-submit or pick your level manually.",
      },
      { headers: noStore }
    );
  }

  return NextResponse.json({ ...grade, saved: true }, { headers: noStore });
}
