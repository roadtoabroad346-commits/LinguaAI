import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placementSubmitSchema } from "@/lib/auth/schemas";
import { checkRateLimit } from "@/lib/api/security";
import { claimCompletion } from "@/lib/completions/claims";
import {
  gradePlacement,
  gradePlacementV3,
  type PlacementV3Grade,
} from "@/lib/placement/scoring";
import { PLACEMENT_TEST_VERSION } from "@/lib/placement/sections";

export const dynamic = "force-dynamic";

/**
 * Grades the placement test deterministically (no AI) and persists the result.
 * v2 (20 grammar questions) stays supported; v3-multi adds reading, listening,
 * spelling, writing, speaking and pronunciation in one reproducible grade.
 * Works account-free for preview: without a session it returns the grade
 * without saving. Authenticated writes go through the atomic
 * save_placement_result RPC (0014) with a legacy insert+update fallback.
 * Idempotent: repeat POSTs with the same idempotencyKey return the stored
 * result with repeated:true instead of inserting a duplicate.
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

  const noStore = { "Cache-Control": "no-store" };

  // Throttle before grading: unauthenticated CPU burn protection.
  const limited = await checkRateLimit(request, { key: "placement-submit", limit: 10 });
  if (limited) return limited;

  const input = parsed.data;
  const hasV3Fields =
    (input.reading?.length ?? 0) > 0 ||
    (input.listening?.length ?? 0) > 0 ||
    (input.spelling?.length ?? 0) > 0 ||
    input.writingText.trim().length > 0 ||
    input.speakingTranscript.trim().length > 0 ||
    input.pronunciationTranscript.trim().length > 0;
  const isV3 = hasV3Fields || (input.testVersion ?? "").startsWith("v3");
  // Stored version always reflects how the server actually graded.
  const storedVersion = isV3 ? PLACEMENT_TEST_VERSION : "v2";

  const grade: PlacementV3Grade | ReturnType<typeof gradePlacement> = isV3
    ? gradePlacementV3({
        grammar: input.answers,
        reading: input.reading,
        listening: input.listening,
        spelling: input.spelling,
        writingText: input.writingText,
        speakingTranscript: input.speakingTranscript,
        speakingSecs: input.speakingSecs,
        pronunciationTranscript: input.pronunciationTranscript,
        pronunciationSecs: input.pronunciationSecs,
      })
    : (gradePlacement(input.answers) as unknown as PlacementV3Grade);

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

  // Idempotency: same attempt key must never create a second history row.
  const attemptKey = (input.idempotencyKey ?? "").trim().slice(0, 120);
  if (attemptKey.length >= 8) {
    try {
      const claim = await claimCompletion(sb as never, u.id, "placement", attemptKey);
      if (!claim.fresh) {
        const { data: latest } = await sb
          .from("placement_results")
          .select("score,total,level,skill_scores,answers,created_at,test_version")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle();
        const row = latest as {
          score?: number;
          total?: number;
          level?: string;
          skill_scores?: unknown;
          answers?: unknown;
          test_version?: string;
        } | null;
        // Return the STORED attempt verbatim (never mix current payload
        // into a previous attempt's grade shape).
        if (row && typeof row.score === "number" && typeof row.total === "number" && typeof row.level === "string") {
          return NextResponse.json(
            {
              score: row.score,
              total: row.total,
              level: row.level,
              percent: row.total > 0 ? Math.round((row.score / row.total) * 100) : 0,
              skill_scores: row.skill_scores ?? null,
              answers: row.answers ?? [],
              testVersion: row.test_version ?? storedVersion,
              saved: true,
              repeated: true,
              xpAwarded: 0,
            },
            { headers: noStore }
          );
        }
        return NextResponse.json(
          { ...grade, saved: true, repeated: true, xpAwarded: 0 },
          { headers: noStore }
        );
      }
    } catch {
      /* fail-open: proceed with the save */
    }
  }

  const v3 = grade as PlacementV3Grade;
  const skillScores =
    isV3 && v3.skills
      ? {
          ...Object.fromEntries(
            (Object.keys(v3.skills) as Array<keyof typeof v3.skills>).map((k) => [
              k,
              {
                correct: v3.skills[k].correct,
                total: v3.skills[k].total,
                score: v3.skills[k].score,
                level: v3.skills[k].level,
                answered: v3.skills[k].answered,
              },
            ])
          ),
          _overall: v3.overall,
          _productive: v3.productive,
          _texts: {
            writing: String(input.writingText ?? "").slice(0, 2000),
            speaking: String(input.speakingTranscript ?? "").slice(0, 2000),
            pronunciation: String(input.pronunciationTranscript ?? "").slice(0, 1500),
          },
        }
      : ((grade as { perBand?: unknown }).perBand ?? {});

  // UPDATE on a missing profile row affects 0 rows with NO error — so every
  // path verifies the level landed, creating the row when it is absent
  // (Google sign-ins that skipped onboarding). Never report saved:true with a lost level.
  async function ensureProfileLevel(): Promise<boolean> {
    const { data: current } = await sb
      .from("profiles")
      .select("level")
      .eq("id", u.id)
      .maybeSingle();
    if ((current as { level?: string | null } | null)?.level === (grade as { level: string }).level)
      return true;
    const now = new Date().toISOString();
    const g = grade as { level: string; percent: number };
    const { error } = await sb.from("profiles").upsert(
      {
        id: u.id,
        email: u.email ?? null,
        level: g.level,
        level_source: "placement",
        placement_completed: true,
        placement_completed_at: now,
        placement_score: g.percent,
        placement_taken_at: now,
        ...(input.learningMode ? { learning_mode: input.learningMode } : {}),
      } as never,
      { onConflict: "id" }
    );
    return !error;
  }

  function unsyncedResponse() {
    // Best-effort draft cleanup even when profile sync needs a retry:
    // the history row exists, so the in-progress draft must not linger.
    try {
      const key = attemptKey.trim().slice(0, 120);
      if (key.length >= 4) {
        void sb.from("placement_drafts").delete().eq("user_id", u.id).eq("attempt_key", key);
      }
    } catch {
      /* best-effort */
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

  async function cleanupDraft() {
    try {
      // Post-submit: no in-progress draft may survive (any key), otherwise
      // the next draft GET resurrects a stale attempt after a saved result.
      await sb.from("placement_drafts").delete().eq("user_id", u.id).eq("status", "in_progress");
    } catch {
      /* best-effort: client also DELETEs */
    }
  }

  // Atomic path: one transaction inserts history + syncs the profile.
  try {
    const g = grade as { score: number; total: number; level: string; answers: unknown };
    const { data: rpcData, error: rpcError } = await supabase.rpc("save_placement_result", {
      payload: {
        score: g.score,
        total: g.total,
        level: g.level,
        answers: (g.answers ?? []) as unknown,
        skillScores: (skillScores ?? {}) as unknown,
        learningMode: parsed.data.learningMode,
        durationSeconds: parsed.data.durationSeconds,
        testVersion: storedVersion,
      },
    } as never);
    if (!rpcError) {
      if (await ensureProfileLevel()) {
        await cleanupDraft();
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

  const g = grade as { score: number; total: number; level: string; answers: unknown };
  const fullInsert: Record<string, unknown> = {
    user_id: user.id,
    score: g.score,
    total: g.total,
    level: g.level,
    answers: g.answers,
    skill_scores: skillScores,
    correct_answers: g.score,
    duration_seconds: parsed.data.durationSeconds ?? null,
    test_version: storedVersion,
  };
  const { error: fullError } = await supabase.from("placement_results").insert(fullInsert as never);
  let resultError = fullError;
  if (fullError && /column|schema cache|skill_scores|correct_answers|duration_seconds|test_version/i.test(fullError.message)) {
    const { error: minError } = await supabase.from("placement_results").insert({
      user_id: user.id,
      score: g.score,
      total: g.total,
      level: g.level,
      answers: g.answers,
    } as never);
    resultError = minError;
  }
  if (resultError) {
    return NextResponse.json({ error: "Could not save placement result." }, { status: 500, headers: noStore });
  }

  const profilePatch: Record<string, unknown> = {
    level: g.level,
    level_source: "placement",
    placement_completed: true,
    placement_completed_at: new Date().toISOString(),
    placement_score: (grade as { percent: number }).percent,
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
        level: g.level,
        placement_score: (grade as { percent: number }).percent,
        placement_taken_at: new Date().toISOString(),
      };
      if (parsed.data.learningMode) legacyPatch.learning_mode = parsed.data.learningMode;
      const { error: legacyError } = await supabase
        .from("profiles")
        .update(legacyPatch as never)
        .eq("id", user.id);
      if (!legacyError && (await ensureProfileLevel())) {
        await cleanupDraft();
        return NextResponse.json({ ...grade, saved: true, migrated: false }, { headers: noStore });
      }
    }
    // History row is saved — verify whether the profile actually got the level
    // (the 0016 trigger syncs it even when the update above fails).
    if (await ensureProfileLevel()) {
      await cleanupDraft();
      return NextResponse.json({ ...grade, saved: true, repaired: true }, { headers: noStore });
    }
    return unsyncedResponse();
  }

  // Update reported success but may have touched 0 rows (absent profile row).
  if (await ensureProfileLevel()) {
    await cleanupDraft();
    return NextResponse.json({ ...grade, saved: true }, { headers: noStore });
  }
  return unsyncedResponse();
}
