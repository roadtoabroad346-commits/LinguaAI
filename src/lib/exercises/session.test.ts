import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listValidatedExercises } from "@/lib/exercises/catalog";
import { toPublicExercise } from "@/lib/exercises/engine";
import { isPracticeSessionComplete, restorePracticeIndex } from "@/lib/exercises/session";

describe("practice session restoration", () => {
  const exercises = listValidatedExercises().slice(0, 3).map(toPublicExercise);

  it("restores by stable id and version instead of answer count", () => {
    const answers = [{ exercise_id: exercises[1].id, content_version: exercises[1].contentVersion }];
    expect(restorePracticeIndex(exercises, answers)).toBe(0);
  });

  it("recognizes a complete session", () => {
    const answers = exercises.map((exercise) => ({ exercise_id: exercise.id, content_version: exercise.contentVersion }));
    expect(isPracticeSessionComplete(exercises, answers)).toBe(true);
    expect(restorePracticeIndex(exercises, answers)).toBe(2);
  });

  it("migration enforces ownership, atomic revision checks and idempotent answers", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20261015120207_universal_practice_engine.sql"), "utf8");
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/\(select auth\.uid\(\)\) = user_id/);
    expect(sql).toMatch(/STALE_WRITE/);
    expect(sql).toMatch(/unique \(session_id, exercise_id, content_version\)/);
    expect(sql).toMatch(/revoke all on function public\.save_practice_answer/);
  });
});
