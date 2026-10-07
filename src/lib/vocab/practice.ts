/** Phase 3 — deterministic vocabulary practice sets (no AI). */
import type { Level } from "@/types/database";
import { VOCAB_BANK, type VocabWord } from "./bank";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";

export interface PracticeQuestion {
  id: string;
  word: string;
  prompt: string;
  choices: string[];
  answer: number;
}

export interface PracticeSet {
  questions: PracticeQuestion[];
  xpPerCorrect: number;
  bonusXp: number;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic shuffle using a numeric seed. */
function shuffled<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build an N-question set. `preferred` (e.g. saved words with low mastery)
 * come first; the rest is filled from the bank at the learner's level.
 * Distractors prefer the same level so questions stay fair.
 */
export function buildPracticeSet(opts: {
  seedKey: string;
  level?: Level | null;
  preferred?: VocabWord[];
  count?: number;
}): PracticeSet {
  const count = Math.max(4, Math.min(12, opts.count ?? 8));
  const seed = hashString(opts.seedKey);
  const levelWords = opts.level ? VOCAB_BANK.filter((w) => w.level === opts.level) : VOCAB_BANK;

  const picked: VocabWord[] = [];
  for (const w of opts.preferred ?? []) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.slug === w.slug)) picked.push(w);
  }
  const rotated = shuffled(levelWords.length > 0 ? levelWords : VOCAB_BANK, seed);
  for (const w of rotated) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.slug === w.slug)) picked.push(w);
  }

  const questions: PracticeQuestion[] = picked.map((w, i) => {
    const sameLevel = shuffled(
      VOCAB_BANK.filter((d) => d.slug !== w.slug && d.level === w.level),
      seed + i * 31
    ).slice(0, 3);
    const filler = sameLevel.length >= 3
      ? sameLevel
      : [...sameLevel, ...shuffled(VOCAB_BANK.filter((d) => d.slug !== w.slug && !sameLevel.includes(d)), seed + i).slice(0, 3 - sameLevel.length)];
    const choices = shuffled([w.definition, ...filler.map((d) => d.definition)], seed + i * 7 + 3);
    return {
      id: `pq-${w.slug}`,
      word: w.word,
      prompt: `What does “${w.word}” mean?`,
      choices,
      answer: choices.indexOf(w.definition),
    };
  });

  return { questions, xpPerCorrect: XP_RULES.vocabPractice.perCorrect, bonusXp: XP_RULES.vocabPractice.bonus };
}

/** Public shape — answers stay server-side. */
export function toPublicPracticeSet(set: PracticeSet) {
  return {
    xpPerCorrect: set.xpPerCorrect,
    bonusXp: set.bonusXp,
    questions: set.questions.map((q) => ({ id: q.id, word: q.word, prompt: q.prompt, choices: q.choices })),
  };
}

export interface PracticeGrade {
  score: number;
  total: number;
  correctIds: string[];
  xpEarned: number;
  perfect: boolean;
}

export function gradePracticeSet(set: PracticeSet, answers: Record<string, number>): PracticeGrade {
  let score = 0;
  const correctIds: string[] = [];
  for (const q of set.questions) {
    const sel = answers[q.id];
    if (Number.isInteger(sel) && sel === q.answer) {
      score += 1;
      correctIds.push(q.id);
    }
  }
  const perfect = score === set.questions.length && set.questions.length > 0;
  return { score, total: set.questions.length, correctIds, xpEarned: xpForGradedSet(set.xpPerCorrect, set.bonusXp, score, set.questions.length), perfect };
}

/**
 * Grade answers given as {word, selected-definition-index} against the bank.
 * Used by POST /api/vocab/practice/complete so the client never holds answers.
 */
export function gradePracticeByWord(selections: Array<{ word: string; selected: number; choices: string[] }>): {
  score: number; total: number; correctWords: string[]; xpEarned: number; perfect: boolean;
} {
  let score = 0;
  const correctWords: string[] = [];
  for (const s of selections) {
    const entry = VOCAB_BANK.find((w) => w.word.toLowerCase() === s.word.toLowerCase());
    if (!entry) continue;
    if (Number.isInteger(s.selected) && s.choices[s.selected] === entry.definition) {
      score += 1;
      correctWords.push(entry.slug);
    }
  }
  const total = selections.length;
  const perfect = total > 0 && score === total;
  return { score, total, correctWords, xpEarned: xpForGradedSet(XP_RULES.vocabPractice.perCorrect, XP_RULES.vocabPractice.bonus, score, total), perfect };
}
