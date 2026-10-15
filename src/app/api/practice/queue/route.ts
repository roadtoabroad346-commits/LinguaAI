import { NextResponse } from "next/server";
import { listValidatedExercises } from "@/lib/exercises/catalog";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DbError = { message: string } | null;
type QueryResult<T> = { data: T; error: DbError };
type Query<T> = PromiseLike<QueryResult<T[]>> & {
  select(columns: string): Query<T>;
  eq(column: string, value: unknown): Query<T>;
  lte(column: string, value: unknown): Query<T>;
  is(column: string, value: null): Query<T>;
  order(column: string, options?: { ascending?: boolean }): Query<T>;
  limit(count: number): Query<T>;
  maybeSingle(): PromiseLike<QueryResult<T | null>>;
};
type DbClient = { from<T>(table: string): Query<T> };

export async function GET() {
  const fallback = { due: [] as string[], mistakes: [] as string[], level: "A1", prioritySkills: [] as string[], saved: false };
  if (!isSupabaseConfigured()) return NextResponse.json(fallback, { headers: { "Cache-Control": "private, no-store" } });
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json(fallback, { headers: { "Cache-Control": "private, no-store" } });
  const db = supabase as unknown as DbClient;

  const [{ data: profile }, dueResult, mistakeResult] = await Promise.all([
    db.from<{ level: string | null; priority_skills: string[] | null }>("profiles").select("level,priority_skills").eq("id", auth.user.id).maybeSingle(),
    db.from<{ exercise_id: string }>("practice_review_schedule").select("exercise_id").eq("user_id", auth.user.id).lte("next_review_at", new Date().toISOString()).order("next_review_at").limit(20),
    db.from<{ exercise_id: string }>("mistake_notebook").select("exercise_id").eq("user_id", auth.user.id).is("resolved_at", null).order("last_seen_at", { ascending: false }).limit(20),
  ]);
  const validIds = new Set(listValidatedExercises().map((exercise) => exercise.id));
  const response = {
    due: (dueResult.data ?? []).map((row) => row.exercise_id).filter((id) => validIds.has(id)),
    mistakes: (mistakeResult.data ?? []).map((row) => row.exercise_id).filter((id) => validIds.has(id)),
    level: profile?.level ?? "A1",
    // Placement/profile data is a recommendation signal only. This endpoint
    // never updates the learner's official level.
    prioritySkills: Array.isArray(profile?.priority_skills) ? profile.priority_skills : [],
    saved: !dueResult.error && !mistakeResult.error,
  };
  return NextResponse.json(response, { headers: { "Cache-Control": "private, no-store" } });
}
