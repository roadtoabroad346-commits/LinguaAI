/** Phase 7 — deterministic spelling engine (no AI, no I/O). Source words come from the Phase-3 vocabulary bank. */
import type { Level } from "@/types/database";
import { VOCAB_BANK, type VocabWord } from "@/lib/vocab/bank";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";

export type SpellingMode = "listen" | "missing" | "choice" | "meaning";

export const SPELLING_MODES: Array<{ id: SpellingMode; title: string; description: string }> = [
  { id: "listen", title: "Listen & Type", description: "Hear the word (TTS) and type its spelling." },
  { id: "meaning", title: "Write from Meaning", description: "Read the definition and type the word." },
  { id: "missing", title: "Missing Letters", description: "Fill in the blanks from the definition." },
  { id: "choice", title: "Pick Correct", description: "Choose the correct spelling from 4 options." },
];

export interface SpellingItem {
  slug: string;
  word: string;
  level: Level;
  definition: string;
  example: string;
  phonetic: string;
  /** missing mode only */
  masked?: string;
  /** choice mode only (public — grading compares against the bank word) */
  choices?: string[];
}

export interface SpellingSet {
  mode: SpellingMode;
  level: string;
  items: SpellingItem[];
  xpPerCorrect: number;
  bonusXp: number;
}

/** XP values live in the central config — this module must not hard-code them. */
export const XP_PER_CORRECT = XP_RULES.spelling.perCorrect;
export const BONUS_XP = XP_RULES.spelling.bonus;

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

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

/** Hide 1–3 interior letters deterministically (first letter always visible). */
export function maskWord(word: string, seed: number): string {
  const chars = word.split("");
  const hideCount = Math.max(1, Math.min(3, Math.ceil(word.length * 0.3)));
  // Candidate positions: interior first, then anywhere except index 0.
  const interior = chars.map((_, i) => i).filter((i) => i > 0 && i < chars.length - 1);
  const fallback = chars.map((_, i) => i).filter((i) => i > 0);
  const pool = interior.length >= hideCount ? interior : fallback;
  const ordered = shuffled(pool, seed);
  const hidden = new Set(ordered.slice(0, Math.min(hideCount, pool.length)));
  return chars.map((c, i) => (hidden.has(i) ? "_" : c)).join("");
}

/** Deterministic misspellings of a word (never equal to the word). */
export function misspellings(word: string, count = 3): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  const push = (s: string) => {
    if (s && s !== w && !out.includes(s) && !VOCAB_BANK.some((v) => v.word === s)) out.push(s);
  };
  // 1. Swap two adjacent interior letters.
  for (let i = 1; i < w.length - 1 && out.length < count; i++) {
    push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
  }
  // 2. Drop one interior char.
  for (let i = 1; i < w.length && out.length < count; i++) {
    push(w.slice(0, i) + w.slice(i + 1));
  }
  // 3. Double an interior letter.
  for (let i = 1; i < w.length - 1 && out.length < count; i++) {
    push(w.slice(0, i) + w[i] + w.slice(i));
  }
  // 4. Common confusion replacements.
  const reps: Array<[RegExp, string]> = [
    [/ie/, "ei"], [/ei/, "ie"], [/ph/g, "f"], [/c/g, "k"], [/s/g, "z"], [/ou/, "u"], [/ll/, "l"], [/ss/, "s"],
  ];
  for (const [re, rep] of reps) {
    if (out.length >= count) break;
    if (re.test(w)) push(w.replace(re, rep));
  }
  // 5. Fallback: append/remove silent e.
  if (out.length < count) push(w.endsWith("e") ? w.slice(0, -1) : `${w}e`);
  if (out.length < count) push(`${w.slice(0, -1)}${w.slice(-1)}${w.slice(-1)}`);
  return out.slice(0, count);
}

export function normalizeSpelling(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Build a deterministic spelling set. `preferred` (e.g. dictionary words)
 * come first; the rest is filled from the bank at the learner's level.
 */
export function buildSpellingSet(opts: {
  seedKey: string;
  mode: SpellingMode;
  level?: Level | null;
  preferred?: VocabWord[];
  count?: number;
}): SpellingSet {
  const count = Math.max(4, Math.min(12, opts.count ?? 8));
  const seed = hashString(`${opts.seedKey}:${opts.mode}:${opts.level ?? "all"}`);
  const levelWords = opts.level ? VOCAB_BANK.filter((w) => w.level === opts.level) : VOCAB_BANK;

  const picked: VocabWord[] = [];
  for (const w of opts.preferred ?? []) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.slug === w.slug)) picked.push(w);
  }
  for (const w of shuffled(levelWords.length > 0 ? levelWords : VOCAB_BANK, seed)) {
    if (picked.length >= count) break;
    if (!picked.some((p) => p.slug === w.slug)) picked.push(w);
  }

  const items: SpellingItem[] = picked.map((w, i) => {
    const base = { slug: w.slug, word: w.word, level: w.level, definition: w.definition, example: w.example, phonetic: w.phonetic };
    if (opts.mode === "missing") return { ...base, masked: maskWord(w.word, seed + i * 13) };
    if (opts.mode === "choice") {
      return { ...base, choices: shuffled([w.word, ...misspellings(w.word, 3)], seed + i * 29) };
    }
    return base;
  });

  return { mode: opts.mode, level: opts.level ?? "mixed", items, xpPerCorrect: XP_RULES.spelling.perCorrect, bonusXp: XP_RULES.spelling.bonus };
}

export interface SpellingAnswer {
  slug: string;
  /** listen/meaning/missing modes */
  typed?: string;
  /** choice mode */
  selected?: number;
  choices?: string[];
}

export interface SpellingGrade {
  score: number;
  total: number;
  correctSlugs: string[];
  wrongSlugs: string[];
  xpEarned: number;
  perfect: boolean;
}

/** Grade answers against the bank (client never holds a separate answer key). */
export function gradeSpellingSet(mode: SpellingMode, answers: SpellingAnswer[]): SpellingGrade {
  let score = 0;
  const correctSlugs: string[] = [];
  const wrongSlugs: string[] = [];
  for (const a of answers) {
    const entry = VOCAB_BANK.find((w) => w.slug === a.slug.trim().toLowerCase());
    if (!entry) {
      wrongSlugs.push(a.slug);
      continue;
    }
    let ok = false;
    if (mode === "choice") {
      const sel = a.selected;
      const choices = a.choices ?? [];
      ok = Number.isInteger(sel) && (sel as number) >= 0 && choices[sel as number] === entry.word;
    } else {
      ok = normalizeSpelling(a.typed ?? "") === entry.word.toLowerCase();
    }
    if (ok) {
      score += 1;
      correctSlugs.push(entry.slug);
    } else {
      wrongSlugs.push(entry.slug);
    }
  }
  const total = answers.length;
  const perfect = total > 0 && score === total;
  return { score, total, correctSlugs, wrongSlugs, xpEarned: xpForGradedSet(XP_RULES.spelling.perCorrect, XP_RULES.spelling.bonus, score, total), perfect };
}

export interface StoredSpellingSession {
  sessionId: string;
  mode: SpellingMode;
  score: number;
  total: number;
  correctSlugs: string[];
  wrongSlugs: string[];
  xpEarned: number;
  perfect: boolean;
}

/**
 * Idempotent re-submit result: returns the ORIGINAL grade with no new XP.
 * Pure — the route loads `stored` from `spelling_sessions` + attempts.
 */
export function repeatedSessionResult(stored: StoredSpellingSession) {
  return {
    score: stored.score,
    total: stored.total,
    correctSlugs: stored.correctSlugs,
    wrongSlugs: stored.wrongSlugs,
    xpEarned: stored.xpEarned,
    perfect: stored.perfect,
    saved: true as const,
    repeated: true as const,
    sessionId: stored.sessionId,
    /** No XP is awarded for a repeated submission. */
    xpAwarded: 0,
    streak: null,
    xpToday: null,
    newAchievements: [] as string[],
  };
}
