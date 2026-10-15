import type { Level } from "@/types/database";

/** C2 is available to the content model, but is not an official placement result yet. */
export type CefrLevel = Level | "C2";

export type LearningSkill =
  | "grammar"
  | "vocabulary"
  | "reading"
  | "listening"
  | "speaking"
  | "pronunciation"
  | "writing"
  | "spelling";

export type ExerciseKind =
  | "multiple-choice"
  | "multiple-select"
  | "fill-blank"
  | "matching"
  | "ordering"
  | "error-correction"
  | "sentence-transformation"
  | "short-answer"
  | "long-form-writing"
  | "reading-comprehension"
  | "audio-comprehension"
  | "dictation"
  | "flashcard"
  | "voice-recording"
  | "pronunciation-practice"
  | "mixed-skill-review";

export type ExerciseAnswer = string | string[] | Record<string, string> | boolean;

export interface ExerciseChoice {
  id: string;
  label: string;
}

export interface ExerciseRubric {
  criteria: Array<{ id: string; label: string; maxPoints: number }>;
  /** Human/AI review is required; the objective scorer never invents a score. */
  requiresReview: true;
}

export interface ExerciseDefinition {
  id: string;
  contentVersion: number;
  level: CefrLevel;
  skill: LearningSkill;
  topic: string;
  kind: ExerciseKind;
  title: string;
  instructions: string;
  prompt: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  explanation: string;
  tags: string[];
  /** Pilot content is visible but must not be presented as validated pathway coverage. */
  validationStatus: "validated" | "pilot";
  choices?: ExerciseChoice[];
  passage?: string;
  audioText?: string;
  tokens?: string[];
  pairs?: Array<{ left: string; right: string }>;
  flashcard?: { front: string; back: string };
  acceptedAnswers?: string[];
  correctChoiceIds?: string[];
  correctOrder?: string[];
  rubric?: ExerciseRubric;
}

export type PublicExercise = Omit<
  ExerciseDefinition,
  "acceptedAnswers" | "correctChoiceIds" | "correctOrder" | "pairs" | "audioText"
> & {
  pairLeft?: string[];
  pairRight?: string[];
  hasReferenceAudio: boolean;
};

export interface ExerciseGrade {
  exerciseId: string;
  contentVersion: number;
  score: number | null;
  correct: boolean | null;
  needsReview: boolean;
  explanation: string;
  expected?: ExerciseAnswer;
}
