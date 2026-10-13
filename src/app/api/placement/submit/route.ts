import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placementSubmitSchema } from "@/lib/auth/schemas";
import { checkRateLimit } from "@/lib/api/security";
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

  // History-append endpoint: per-IP limit against submit spam.
  const limited = checkRateLimit(request, { key: "placement-submit", limit: 10 });
  if (limited) return limited;

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
  // Non-null captures for the verify helper below (narrowing is lost inside closures).
  const sb = supabase;
  const u = user;
  const input = parsed.data;

  // UPDATE on a missing profile row affects 0 rows with NO error — so every
  // path verifies the level landed, creating the row when it is absent
  // (Google sign-ins that skipped onboarding). Never report saved:true with a lost level.
  async function ensureProfileLevel(): Promise<boolean> {
    const { data: current } = await sb
      .from("profiles")
      .select("level")
      .eq("id", u.id)
      .maybeSingle();
    if ((current as { level?: string | null } | null)?.level === grade.level) return true;
    const now = new Date().toISOString();
    const { error } = await sb.from("profiles").upsert(
      {
        id: u.id,
        email: u.email ?? null,
        level: grade.level,
        level_source: "placement",
        placement_completed: true,
        placement_completed_at: now,
        placement_score: grade.percent,
        placement_taken_at: now,
        ...(input.learningMode ? { learning_mode: input.learningMode } : {}),
      } as never,
      { onConflict: "id" }
    );
    return !error;
  }

  function unsyncedResponse() {
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
      if (await ensureProfileLevel()) {
        return NextResponse.json(
          { ...grade, saved: true, receipt: rpcData ?? null },
          { headers: noStore }
        );
      }
      return unsyncedResponse();
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
      if (!legacyError && (await ensureProfileLevel())) {
        return NextResponse.json({ ...grade, saved: true, migrated: false }, { headers: noStore });
      }
    }
    // History row is saved — verify whether the profile actually got the level
    // (the 0016 trigger syncs it even when the update above fails).
    if (await ensureProfileLevel()) {
      return NextResponse.json({ ...grade, saved: true, repaired: true }, { headers: noStore });
    }
    return unsyncedResponse();
  }

  // Update reported success but may have touched 0 rows (absent profile row).
  if (await ensureProfileLevel()) {
    return NextResponse.json({ ...grade, saved: true }, { headers: noStore });
  }
  return unsyncedResponse();
}
