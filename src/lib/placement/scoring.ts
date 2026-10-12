import type { Level } from "@/lib/constants";
import { LEVELS } from "@/lib/constants";
import { PLACEMENT_QUESTIONS, type PlacementQuestion } from "./questions";

export interface GradeInput {
  questionId: string;
  selected: number;
}

export interface GradedAnswer extends GradeInput {
  correct: boolean;
  level: Level;
}

export interface PlacementGrade {
  score: number;
  total: number;
  percent: number;
  level: Level;
  perBand: Record<Level, { correct: number; total: number }>;
  answers: GradedAnswer[];
}

/**
 * Deterministic scoring — no AI.
 * Thresholds on 20 questions: 0–5 A1, 6–9 A2, 10–13 B1, 14–17 B2, 18–20 C1.
 */
export function gradePlacement(inputs: GradeInput[]): PlacementGrade {
  const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
  const answers: GradedAnswer[] = [];
  const perBand: PlacementGrade["perBand"] = {
    A1: { correct: 0, total: 0 },
    A2: { correct: 0, total: 0 },
    B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 },
    C1: { correct: 0, total: 0 },
  };
  for (const q of PLACEMENT_QUESTIONS) perBand[q.level].total += 1;

  const seen = new Set<string>();
  for (const a of inputs) {
    const q = byId.get(a.questionId);
    if (!q || seen.has(a.questionId)) continue;
    seen.add(a.questionId);
    const correct = a.selected === q.answer;
    if (correct) perBand[q.level].correct += 1;
    answers.push({ ...a, correct, level: q.level });
  }

  const score = answers.filter((a) => a.correct).length;
  const total = PLACEMENT_QUESTIONS.length;
  const percent = Math.round((score / total) * 100);
  return { score, total, percent, level: scoreToLevel(score), perBand, answers };
}

export function scoreToLevel(score: number): Level {
  if (score >= 18) return "C1";
  if (score >= 14) return "B2";
  if (score >= 10) return "B1";
  if (score >= 6) return "A2";
  return "A1";
}

export interface ReviewedAnswer {
  question: PlacementQuestion;
  selected: number;
  correct: boolean;
}

/** Joins graded answers with the question bank for the mistake-review UI. */
export function buildReview(grade: PlacementGrade): ReviewedAnswer[] {
  const byId = new Map(PLACEMENT_QUESTIONS.map((q) => [q.id, q]));
  const out: ReviewedAnswer[] = [];
  for (const a of grade.answers) {
    const q = byId.get(a.questionId);
    if (q) out.push({ question: q, selected: a.selected, correct: a.correct });
  }
  return out;
}

/** Band with the lowest accuracy (ties resolve to the lower band — fix foundations first). */
export function weakestBand(perBand: PlacementGrade["perBand"]): Level {
  let worst: Level = "A1";
  let worstRate = 2;
  for (const band of LEVELS) {
    const b = perBand[band];
    const rate = b.total > 0 ? b.correct / b.total : 1;
    if (rate < worstRate) {
      worstRate = rate;
      worst = band;
    }
  }
  return worst;
}

/** Unique topics of the missed questions, in test order (what to study next). */
export function missedTopics(review: ReviewedAnswer[]): string[] {
  const seen = new Set<string>();
  for (const r of review) {
    if (!r.correct && !seen.has(r.question.topic)) seen.add(r.question.topic);
  }
  return Array.from(seen);
}

export const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  A1: "Beginner — everyday words and simple sentences.",
  A2: "Elementary — routine phrases and past experiences.",
  B1: "Intermediate — independent conversation and narration.",
  B2: "Upper-intermediate — fluent discussion and argument.",
  C1: "Advanced — nuanced, precise, near-fluent English.",
};
