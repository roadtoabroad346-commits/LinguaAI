import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/api/security";
import { getExercise } from "@/lib/exercises/catalog";
import { scoreExercise } from "@/lib/exercises/engine";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DbError = { message: string } | null;
type QueryResult<T> = { data: T; error: DbError };
type Query<T> = PromiseLike<QueryResult<T[]>> & {
  select(columns: string): Query<T>;
  eq(column: string, value: unknown): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
  maybeSingle(): PromiseLike<QueryResult<T | null>>;
};
type DbClient = { from<T>(table: string): Query<T> };
type RestoredSession = { id: string; status: string; revision: number } & Record<string, unknown>;
type RestoredAnswer = { exercise_id: string; content_version: number; answer: unknown; score: number | null; correct: boolean | null } & Record<string, unknown>;

const answerSchema = z.union([
  z.string().max(5000),
  z.array(z.string().max(500)).max(40),
  z.record(z.string().max(500)),
  z.boolean(),
]);

const saveSchema = z.object({
  sessionKey: z.string().uuid(),
  expectedRevision: z.number().int().min(0).max(10000),
  mode: z.enum(["daily", "smart-review", "mixed", "topic", "skill"]),
  exerciseId: z.string().min(1).max(120),
  contentVersion: z.number().int().min(1).max(1000),
  answer: answerSchema,
  complete: z.boolean().optional().default(false),
});

function noStore(json: unknown, init?: ResponseInit) {
  const response = NextResponse.json(json, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("sessionKey");
  if (!key || !z.string().uuid().safeParse(key).success) return noStore({ error: "Invalid session key." }, { status: 400 });
  if (!isSupabaseConfigured()) return noStore({ session: null, answers: [], saved: false });

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return noStore({ session: null, answers: [], saved: false });
  const db = supabase as unknown as DbClient;

  const { data: session, error } = await db
    .from<RestoredSession>("practice_sessions")
    .select("id,session_key,mode,level,skill,topic,status,score,total,revision,state,started_at,completed_at,updated_at")
    .eq("user_id", auth.user.id)
    .eq("session_key", key)
    .maybeSingle();
  if (error) return noStore({ session: null, answers: [], saved: false, reason: "Practice migration is not applied." });
  if (!session) return noStore({ session: null, answers: [], saved: true });

  const { data: answers } = await db
    .from<RestoredAnswer>("practice_answers")
    .select("exercise_id,content_version,answer,score,correct,feedback,answered_at")
    .eq("session_id", session.id)
    .order("answered_at", { ascending: true });
  return noStore({ session, answers: answers ?? [], saved: true });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStore({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return noStore({ error: "Invalid practice answer.", issues: parsed.error.flatten() }, { status: 400 });

  const exercise = getExercise(parsed.data.exerciseId, parsed.data.contentVersion);
  if (!exercise || exercise.validationStatus !== "validated") return noStore({ error: "Exercise not found." }, { status: 404 });
  const grade = scoreExercise(exercise, parsed.data.answer);

  if (!isSupabaseConfigured()) return noStore({ ...grade, saved: false, revision: parsed.data.expectedRevision });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return noStore({ ...grade, saved: false, revision: parsed.data.expectedRevision });

  const limited = await checkRateLimit(request, { key: "practice-save", limit: 90, scope: auth.user.id });
  if (limited) return limited;

  const rpc = supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => PromiseLike<{
    data: Array<{ session_id: string; revision: number; session_score: number; answer_count: number; status: string }> | null;
    error: { code: string; message: string } | null;
  }>;
  const { data, error } = await rpc("save_practice_answer", {
    p_session_key: parsed.data.sessionKey,
    p_expected_revision: parsed.data.expectedRevision,
    p_mode: parsed.data.mode,
    p_level: exercise.level,
    p_skill: exercise.skill,
    p_topic: exercise.topic,
    p_exercise_id: exercise.id,
    p_content_version: exercise.contentVersion,
    p_answer: parsed.data.answer,
    p_score: grade.score,
    p_correct: grade.correct,
    p_feedback: { explanation: grade.explanation, needsReview: grade.needsReview },
    p_state: { lastExerciseId: exercise.id },
    p_complete: parsed.data.complete,
  });

  if (error) {
    if (error.code === "40001" || /STALE_WRITE/i.test(error.message)) {
      return noStore({ error: "This practice session changed in another tab. Reload to continue safely.", code: "STALE_WRITE" }, { status: 409 });
    }
    return noStore({ ...grade, saved: false, revision: parsed.data.expectedRevision, reason: "Practice history could not be saved." });
  }

  const saved = data?.[0];
  return noStore({
    ...grade,
    saved: true,
    sessionId: saved?.session_id,
    revision: saved?.revision ?? parsed.data.expectedRevision + 1,
    sessionScore: saved?.session_score ?? grade.score,
    answerCount: saved?.answer_count ?? 1,
    status: saved?.status ?? (parsed.data.complete ? "completed" : "in_progress"),
  });
}
