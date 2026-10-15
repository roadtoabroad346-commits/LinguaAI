import type { PublicExercise } from "@/lib/exercises/types";

export interface PersistedPracticeAnswer { exercise_id: string; content_version: number; }

/**
 * Finds the first unanswered item by stable ID + content version. This avoids
 * skipping work when catalogue order changes between deployments.
 */
export function restorePracticeIndex(exercises: PublicExercise[], answers: PersistedPracticeAnswer[]): number {
  const answered = new Set(answers.map((answer) => `${answer.exercise_id}@${answer.content_version}`));
  const next = exercises.findIndex((exercise) => !answered.has(`${exercise.id}@${exercise.contentVersion}`));
  return next === -1 ? Math.max(0, exercises.length - 1) : next;
}

export function isPracticeSessionComplete(exercises: PublicExercise[], answers: PersistedPracticeAnswer[]): boolean {
  if (exercises.length === 0) return false;
  const answered = new Set(answers.map((answer) => `${answer.exercise_id}@${answer.content_version}`));
  return exercises.every((exercise) => answered.has(`${exercise.id}@${exercise.contentVersion}`));
}
