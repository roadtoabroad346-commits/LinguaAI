import type {
  ExerciseAnswer,
  ExerciseDefinition,
  ExerciseGrade,
  PublicExercise,
} from "@/lib/exercises/types";

export function normalizeExerciseText(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sameStrings(a: string[], b: string[], ordered: boolean): boolean {
  const left = a.map(normalizeExerciseText);
  const right = b.map(normalizeExerciseText);
  if (left.length !== right.length) return false;
  if (ordered) return left.every((value, index) => value === right[index]);
  return [...left].sort().every((value, index) => value === [...right].sort()[index]);
}

function expectedAnswer(exercise: ExerciseDefinition): ExerciseAnswer | undefined {
  if (exercise.correctChoiceIds) {
    return exercise.correctChoiceIds.length === 1 ? exercise.correctChoiceIds[0] : exercise.correctChoiceIds;
  }
  if (exercise.correctOrder) return exercise.correctOrder;
  if (exercise.pairs) return Object.fromEntries(exercise.pairs.map((pair) => [pair.left, pair.right]));
  if (exercise.acceptedAnswers) return exercise.acceptedAnswers[0] ?? "";
  return undefined;
}

export function scoreExercise(exercise: ExerciseDefinition, answer: ExerciseAnswer): ExerciseGrade {
  if (exercise.rubric || exercise.kind === "voice-recording" || exercise.kind === "pronunciation-practice") {
    return {
      exerciseId: exercise.id,
      contentVersion: exercise.contentVersion,
      score: null,
      correct: null,
      needsReview: true,
      explanation: exercise.explanation,
    };
  }

  let correct = false;
  switch (exercise.kind) {
    case "multiple-choice":
    case "reading-comprehension":
    case "audio-comprehension":
    case "mixed-skill-review":
      correct = typeof answer === "string" && exercise.correctChoiceIds?.[0] === answer;
      break;
    case "multiple-select":
      correct = Array.isArray(answer) && sameStrings(answer, exercise.correctChoiceIds ?? [], false);
      break;
    case "matching": {
      const expected = new Map((exercise.pairs ?? []).map((pair) => [pair.left, pair.right]));
      correct = typeof answer === "object" && !Array.isArray(answer) && answer !== null
        && expected.size === Object.keys(answer).length
        && [...expected].every(([left, right]) => normalizeExerciseText(answer[left] ?? "") === normalizeExerciseText(right));
      break;
    }
    case "ordering":
      correct = Array.isArray(answer) && sameStrings(answer, exercise.correctOrder ?? [], true);
      break;
    case "flashcard":
      correct = answer === "known";
      break;
    default:
      correct = typeof answer === "string" && (exercise.acceptedAnswers ?? [])
        .some((candidate) => normalizeExerciseText(answer) === normalizeExerciseText(candidate));
  }

  return {
    exerciseId: exercise.id,
    contentVersion: exercise.contentVersion,
    score: correct ? 100 : 0,
    correct,
    needsReview: false,
    explanation: exercise.explanation,
    expected: correct ? undefined : expectedAnswer(exercise),
  };
}

export function toPublicExercise(exercise: ExerciseDefinition): PublicExercise {
  const pairs = exercise.pairs;
  const audioText = exercise.audioText;
  const safe = Object.fromEntries(Object.entries(exercise).filter(([key]) => ![
    "acceptedAnswers", "correctChoiceIds", "correctOrder", "pairs", "audioText",
  ].includes(key))) as Omit<ExerciseDefinition, "acceptedAnswers" | "correctChoiceIds" | "correctOrder" | "pairs" | "audioText">;
  return {
    ...safe,
    pairLeft: pairs?.map((pair) => pair.left),
    pairRight: pairs?.map((pair) => pair.right).reverse(),
    hasReferenceAudio: Boolean(audioText),
  };
}

export function validateExerciseCatalog(exercises: ExerciseDefinition[]): string[] {
  const errors: string[] = [];
  const versions = new Set<string>();
  for (const exercise of exercises) {
    const key = `${exercise.id}@${exercise.contentVersion}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exercise.id)) errors.push(`${key}: invalid stable id`);
    if (versions.has(key)) errors.push(`${key}: duplicate id/version`);
    versions.add(key);
    if (!exercise.instructions.trim() || !exercise.explanation.trim()) errors.push(`${key}: missing teaching text`);
    if (exercise.choices) {
      const ids = exercise.choices.map((choice) => choice.id);
      if (new Set(ids).size !== ids.length) errors.push(`${key}: duplicate choice id`);
      if ((exercise.correctChoiceIds ?? []).some((id) => !ids.includes(id))) errors.push(`${key}: unknown correct choice`);
    }
    if (exercise.kind === "matching" && !exercise.pairs?.length) errors.push(`${key}: missing pairs`);
    if (exercise.kind === "ordering" && !exercise.correctOrder?.length) errors.push(`${key}: missing order`);
    if (["long-form-writing", "voice-recording", "pronunciation-practice"].includes(exercise.kind) && !exercise.rubric) {
      errors.push(`${key}: productive task needs a rubric`);
    }
  }
  return errors;
}
