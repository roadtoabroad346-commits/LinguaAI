import type { Level } from "@/lib/constants";
import { LEVELS } from "@/lib/constants";
import { PLACEMENT_QUESTIONS, type PlacementQuestion } from "./questions";
import {
  getPlacementListening,
  getPlacementReading,
  getPlacementSpelling,
  PLACEMENT_PRONUNCIATION,
  PLACEMENT_SPEAKING,
  PLACEMENT_WRITING,
  type PlacementSkill,
} from "./sections";
import { analyzeWriting } from "@/lib/writing/analyze";
import { analyzeReadAloud, analyzeSpeaking } from "@/lib/speaking/analyze";
import { VOCAB_BANK } from "@/lib/vocab/bank";
import { READING_PASSAGES } from "@/lib/reading/library";
import { LISTENING_TRACKS } from "@/lib/listening/library";

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

/* ---------------- Placement v3: multi-skill (deterministic, no AI) ---------------- */

export type SkillConfidence = "high" | "medium" | "low";

export interface PlacementSkillScore {
  correct: number;
  total: number;
  /** 0–100. Objective accuracy or deterministic analyzer score. */
  score: number;
  level: Level;
  answered: boolean;
  confidence: SkillConfidence;
  note?: string;
}

export interface PlacementV3Input {
  grammar?: GradeInput[];
  reading?: GradeInput[];
  listening?: GradeInput[];
  spelling?: Array<{ slug: string; typed?: string; selected?: number; choices?: string[] }>;
  writingText?: string;
  speakingTranscript?: string;
  speakingSecs?: number;
  pronunciationTranscript?: string;
  pronunciationSecs?: number;
}

export interface PlacementV3Grade extends PlacementGrade {
  version: "v3-multi";
  skills: Record<PlacementSkill, PlacementSkillScore>;
  overall: {
    percent: number;
    level: Level;
    confidence: SkillConfidence;
    coverage: number;
    insufficient: boolean;
    gaps: PlacementSkill[];
    strengths: PlacementSkill[];
  };
  productive: {
    writingWords: number;
    writingScore: number;
    speakingWords: number;
    speakingScore: number;
    speakingTimed: boolean;
    pronunciationAccuracy: number;
    pronunciationScore: number;
  };
}

/**
 * Percent (0–100) → CEFR. Shared by every v3 skill so results stay comparable:
 * <30 A1, <50 A2, <70 B1, <85 B2, else C1.
 */
export function percentToLevel(percent: number): Level {
  const p = Number.isFinite(percent) ? percent : 0;
  if (p >= 85) return "C1";
  if (p >= 70) return "B2";
  if (p >= 50) return "B1";
  if (p >= 30) return "A2";
  return "A1";
}

export function levelIndex(level: Level): number {
  return LEVELS.indexOf(level);
}

function confidenceForObjective(answered: number, total: number): SkillConfidence {
  if (total <= 0) return "low";
  const ratio = answered / total;
  if (ratio >= 0.85) return "high";
  if (ratio >= 0.5) return "medium";
  return "low";
}

function gradeObjectiveByValue(
  bank: Array<{ id: string; choices: string[]; answer: number }>,
  inputs: GradeInput[] | undefined
): { correct: number; total: number; answered: number } {
  const byId = new Map(bank.map((q) => [q.id, q]));
  const seen = new Set<string>();
  let correct = 0;
  let answered = 0;
  for (const a of inputs ?? []) {
    if (!a || typeof a.questionId !== "string") continue;
    if (seen.has(a.questionId)) continue;
    const q = byId.get(a.questionId);
    if (!q) continue;
    seen.add(a.questionId);
    answered += 1;
    if (Number.isInteger(a.selected) && q.choices[a.selected] === q.choices[q.answer]) {
      correct += 1;
    }
  }
  return { correct, total: bank.length, answered };
}

/**
 * Full v3 grading — pure and reproducible. Never calls AI.
 * Productive skills use the same deterministic analyzers as their modules:
 * writing → analyzeWriting, speaking → analyzeSpeaking (text proxy, honest),
 * pronunciation → analyzeReadAloud word-match (NOT phoneme analysis).
 */
export function gradePlacementV3(input: PlacementV3Input): PlacementV3Grade {
  const legacy = gradePlacement(input.grammar ?? []);

  // Reading (6 items from the shared library).
  const readingBank = getPlacementReading().map((r) => {
    const passage = READING_PASSAGES.find((p) => p.slug === r.passageSlug);
    const q = passage?.questions.find((x) => x.id === r.questionId);
    return { id: r.questionId, choices: q?.choices ?? r.choices, answer: (q?.answer ?? 0) as number };
  });
  const readingRes = gradeObjectiveByValue(readingBank, input.reading);
  const readingPercent = readingRes.total > 0 ? Math.round((readingRes.correct / readingRes.total) * 100) : 0;
  const readingAnswered = readingRes.answered >= Math.ceil(readingRes.total / 2);

  // Listening (6 items from the shared library).
  const listeningBank = getPlacementListening().map((r) => {
    const track = LISTENING_TRACKS.find((t) => t.slug === r.trackSlug);
    const q = track?.questions.find((x) => x.id === r.questionId);
    return { id: r.questionId, choices: q?.choices ?? r.choices, answer: (q?.answer ?? 0) as number };
  });
  const listeningRes = gradeObjectiveByValue(listeningBank, input.listening);
  const listeningPercent =
    listeningRes.total > 0 ? Math.round((listeningRes.correct / listeningRes.total) * 100) : 0;
  const listeningAnswered = listeningRes.answered >= Math.ceil(listeningRes.total / 2);

  // Spelling (8 words: 4 choice + 4 typed).
  const spellingItems = getPlacementSpelling();
  let spellingCorrect = 0;
  let spellingAnswered = 0;
  const seenSpelling = new Set<string>();
  const spellingInputs = input.spelling ?? [];
  for (const a of spellingInputs) {
    if (!a || typeof a.slug !== "string" || seenSpelling.has(a.slug)) continue;
    const entry = spellingItems.find((x) => x.slug === a.slug) ?? VOCAB_BANK.find((w) => w.slug === a.slug);
    const bankWord = VOCAB_BANK.find((w) => w.slug === a.slug);
    if (!entry || !bankWord) continue;
    seenSpelling.add(a.slug);
    spellingAnswered += 1;
    if (typeof a.selected === "number" && Array.isArray(a.choices)) {
      if (Number.isInteger(a.selected) && a.choices[a.selected] === bankWord.word) spellingCorrect += 1;
    } else {
      const typed = String(a.typed ?? "").trim().toLowerCase();
      if (typed.length > 0 && typed === bankWord.word.toLowerCase()) spellingCorrect += 1;
    }
  }
  const spellingTotal = spellingItems.length;
  const spellingPercent = spellingTotal > 0 ? Math.round((spellingCorrect / spellingTotal) * 100) : 0;
  const spellingDone = spellingAnswered >= Math.ceil(spellingTotal / 2);

  // Writing (deterministic analyzer, same as /writing).
  const writingText = String(input.writingText ?? "").slice(0, 3000);
  const writingAnalysis = analyzeWriting(writingText, {
    minWords: PLACEMENT_WRITING.minWords,
    maxWords: PLACEMENT_WRITING.maxWords,
  });
  const writingWords = writingAnalysis.wordCount;
  const writingAnswered = writingWords >= 15;
  const writingConfidence: SkillConfidence =
    writingWords >= PLACEMENT_WRITING.minWords ? "high" : writingWords >= 25 ? "medium" : "low";

  // Speaking (transcript proxy — honest about limits, same as /speaking).
  const speakingTranscript = String(input.speakingTranscript ?? "").slice(0, 3000);
  const speakingSecs = Math.max(0, Math.min(600, Math.round(Number(input.speakingSecs) || 0)));
  const speakingAnalysis = analyzeSpeaking(speakingTranscript, {
    minWords: PLACEMENT_SPEAKING.minWords,
    durationSecs: speakingSecs,
  });
  const speakingWords = speakingAnalysis.wordCount;
  const speakingAnswered = speakingWords >= 10;
  const speakingTimed = speakingSecs >= 5;
  const speakingConfidence: SkillConfidence =
    speakingWords >= PLACEMENT_SPEAKING.minWords && speakingTimed
      ? "high"
      : speakingWords >= 20
        ? "medium"
        : "low";

  // Pronunciation: read-aloud word-match (NOT phoneme/accent scoring).
  const pronTranscript = String(input.pronunciationTranscript ?? "").slice(0, 2000);
  const pronSecs = Math.max(0, Math.min(600, Math.round(Number(input.pronunciationSecs) || 0)));
  const pronAnalysis = analyzeReadAloud(PLACEMENT_PRONUNCIATION.text, pronTranscript, pronSecs);
  const pronAnswered = pronAnalysis.wordCount >= 8;
  const pronConfidence: SkillConfidence =
    pronAnalysis.wordCount >= 20 ? "high" : pronAnalysis.wordCount >= 12 ? "medium" : "low";

  const grammarPercent = legacy.percent;
  const grammarAnswered = legacy.answers.length >= 10;

  const skills: Record<PlacementSkill, PlacementSkillScore> = {
    grammar: {
      correct: legacy.score,
      total: legacy.total,
      score: grammarPercent,
      level: legacy.level,
      answered: grammarAnswered,
      confidence: confidenceForObjective(legacy.answers.length, legacy.total),
    },
    reading: {
      correct: readingRes.correct,
      total: readingRes.total,
      score: readingPercent,
      level: percentToLevel(readingPercent),
      answered: readingAnswered,
      confidence: confidenceForObjective(readingRes.answered, readingRes.total),
      note: "Passages stay in English; questions test comprehension, not outside knowledge.",
    },
    listening: {
      correct: listeningRes.correct,
      total: listeningRes.total,
      score: listeningPercent,
      level: percentToLevel(listeningPercent),
      answered: listeningAnswered,
      confidence: confidenceForObjective(listeningRes.answered, listeningRes.total),
      note: "Audio is browser speech synthesis; replay is allowed before answering.",
    },
    spelling: {
      correct: spellingCorrect,
      total: spellingTotal,
      score: spellingPercent,
      level: percentToLevel(spellingPercent),
      answered: spellingDone,
      confidence: confidenceForObjective(spellingAnswered, spellingTotal),
    },
    writing: {
      correct: writingAnalysis.score,
      total: 100,
      score: writingAnalysis.score,
      level: percentToLevel(writingAnalysis.score),
      answered: writingAnswered,
      confidence: writingConfidence,
    },
    speaking: {
      correct: speakingAnalysis.score,
      total: 100,
      score: speakingAnalysis.score,
      level: percentToLevel(speakingAnalysis.score),
      answered: speakingAnswered,
      confidence: speakingConfidence,
      note: speakingTimed
        ? "Transcript-based estimate; it cannot hear pronunciation."
        : "Typed answer — pace unknown. Recording adds timing evidence.",
    },
    pronunciation: {
      correct: pronAnalysis.accuracy,
      total: 100,
      score: pronAnalysis.score,
      level: percentToLevel(pronAnalysis.score),
      answered: pronAnswered,
      confidence: pronConfidence,
      note: "Read-aloud word match only — not phoneme, accent, stress or intonation scoring.",
    },
  };

  const answeredSkills = (Object.keys(skills) as PlacementSkill[]).filter((k) => skills[k].answered);
  const coverage = answeredSkills.length;
  const insufficient = coverage < 4;

  // Overall: mean of ANSWERED skill scores (equal weights, reproducible).
  // Unanswered skills are excluded — never counted as zero.
  const answeredScores = answeredSkills.map((k) => skills[k].score);
  const overallPercent =
    answeredScores.length > 0
      ? Math.round(answeredScores.reduce((s, x) => s + x, 0) / answeredScores.length)
      : 0;
  const overallLevel = insufficient ? percentToLevel(overallPercent) : percentToLevel(overallPercent);

  const overallIdx = levelIndex(overallLevel);
  const gaps = answeredSkills.filter((k) => levelIndex(skills[k].level) <= overallIdx - 2);
  const strengths = answeredSkills.filter((k) => levelIndex(skills[k].level) >= overallIdx + 1);

  const lowConf = answeredSkills.some((k) => skills[k].confidence === "low");
  const confidence: SkillConfidence = insufficient || lowConf ? "low" : coverage >= 6 ? "high" : "medium";

  // DB-compatible score/total: v3 stores overall percent as score/100.
  return {
    ...legacy,
    version: "v3-multi",
    score: overallPercent,
    total: 100,
    percent: overallPercent,
    level: overallLevel,
    skills,
    overall: {
      percent: overallPercent,
      level: overallLevel,
      confidence,
      coverage,
      insufficient,
      gaps,
      strengths,
    },
    productive: {
      writingWords,
      writingScore: writingAnalysis.score,
      speakingWords,
      speakingScore: speakingAnalysis.score,
      speakingTimed,
      pronunciationAccuracy: pronAnalysis.accuracy,
      pronunciationScore: pronAnalysis.score,
    },
  };
}

/** Human-readable one-line summary for profile / Smart Path consumers. */
export function summarizeV3(grade: PlacementV3Grade): string {
  if (grade.overall.insufficient) {
    return `Insufficient data (${grade.overall.coverage}/7 skills) — complete at least 4 sections for a reliable level.`;
  }
  const gaps = grade.overall.gaps.length > 0 ? ` Gaps: ${grade.overall.gaps.join(", ")}.` : "";
  return `Estimated ${grade.overall.level} (${grade.overall.percent}%) from ${grade.overall.coverage}/7 skills.${gaps} This is an estimate, not an official certification.`;
}
