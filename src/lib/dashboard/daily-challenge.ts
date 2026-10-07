/** Phase 2 (+7) — deterministic Daily Challenge (no AI). 5 questions, date-rotated, one per skill. */
import type { Level } from "@/types/database";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";
import { misspellings } from "@/lib/spelling/spelling";

export type ChallengeKind = "vocab" | "grammar" | "spelling" | "reading" | "listening";

export interface ChallengeQuestion {
  id: string;
  kind: ChallengeKind;
  prompt: string;
  choices: string[];
  answer: number;
  hint: string;
}

export interface DailyChallenge {
  dateKey: string;
  level: string;
  questions: ChallengeQuestion[];
  xpPerCorrect: number;
  bonusXp: number;
}

export const POOL: ChallengeQuestion[] = [
  { id: "v1", kind: "vocab", prompt: "Choose the word that means “a trip from one place to another”.", choices: ["journey", "jewel", "jungle", "judge"], answer: 0, hint: "Starts with “jour-”." },
  { id: "v2", kind: "vocab", prompt: "“Reliable” means…", choices: ["always late", "someone you can trust", "very expensive", "afraid of people"], answer: 1, hint: "Think of a friend you trust." },
  { id: "v3", kind: "vocab", prompt: "Choose the correct word: “Reading every day is a good ___.”", choices: ["habit", "rabbit", "habitat", "helmet"], answer: 0, hint: "Something you do regularly." },
  { id: "v4", kind: "vocab", prompt: "“Curious” describes a person who…", choices: ["wants to learn", "wants to sleep", "wants to argue", "wants to hide"], answer: 0, hint: "Asks lots of questions." },
  { id: "v5", kind: "vocab", prompt: "“Efficient” means…", choices: ["slow and lazy", "working well without waste", "very loud", "full of mistakes"], answer: 1, hint: "Good use of time." },
  { id: "v6", kind: "vocab", prompt: "Choose the word for “to continue trying despite problems”.", choices: ["persist", "insist", "resist", "exist"], answer: 0, hint: "Starts with “p”, ends with “-sist”." },
  { id: "g1", kind: "grammar", prompt: "She ___ to school every day.", choices: ["go", "goes", "going", "gone"], answer: 1, hint: "Third person singular + present simple." },
  { id: "g2", kind: "grammar", prompt: "I have lived here ___ 2020.", choices: ["for", "since", "from", "at"], answer: 1, hint: "Use with a starting point in time." },
  { id: "g3", kind: "grammar", prompt: "If it rains, we ___ at home.", choices: ["stay", "will stay", "stayed", "have stayed"], answer: 1, hint: "First conditional." },
  { id: "g4", kind: "grammar", prompt: "This book ___ by many students.", choices: ["reads", "is read", "readed", "reading"], answer: 1, hint: "Passive voice." },
  { id: "g5", kind: "grammar", prompt: "He is interested ___ music.", choices: ["on", "at", "in", "for"], answer: 2, hint: "Fixed preposition after “interested”." },
  { id: "g6", kind: "grammar", prompt: "___ you ever been to London?", choices: ["Did", "Have", "Are", "Do"], answer: 1, hint: "Present perfect question." },
  // Spelling (choose the correctly spelled word — distractors from the spelling engine).
  ...["reliable", "opportunity", "necessary", "occurred", "separate"].map((word, i): ChallengeQuestion => {
    const id = `s${i + 1}`;
    const seed = 1000 + i * 77;
    const decoys = misspellings(word, 3);
    // Deterministic rotation of the correct answer position (0–3).
    const pos = seed % 4;
    const choices = [...decoys];
    choices.splice(pos, 0, word);
    return {
      id,
      kind: "spelling",
      prompt: `Choose the correct spelling.`,
      choices,
      answer: pos,
      hint: `The word means: “${hintFor(word)}”`,
    };
  }),
  // Reading comprehension (self-contained micro-texts).
  { id: "r1", kind: "reading", prompt: "Read: “Anna takes the bus to work every day. The ride takes 30 minutes.” How does Anna get to work?", choices: ["By bus", "By car", "On foot", "By train"], answer: 0, hint: "The first sentence names her transport." },
  { id: "r2", kind: "reading", prompt: "Read: “The museum opens at 9 a.m. and closes at 6 p.m. Entry is free on Sundays.” When is entry free?", choices: ["On Saturdays", "On Sundays", "After 6 p.m.", "Before 9 a.m."], answer: 1, hint: "Look at the last sentence." },
  { id: "r3", kind: "reading", prompt: "Read: “It rained all morning, so the football match was moved indoors.” Why was the match moved?", choices: ["Too many fans", "The rain", "Broken lights", "No referee"], answer: 1, hint: "What does “so” connect to the rain?" },
  // Listening-style comprehension (read the line as if you heard it).
  { id: "l1", kind: "listening", prompt: "You hear: “Could you speak a little more slowly, please?” What does the speaker want?", choices: ["Louder music", "Slower speech", "A different seat", "The bill"], answer: 1, hint: "They ask about speed, not volume." },
  { id: "l2", kind: "listening", prompt: "You hear: “The next train leaves platform 4 in five minutes.” Where should you go?", choices: ["Platform 4", "The ticket office", "The bus stop", "Platform 5"], answer: 0, hint: "The platform number is named directly." },
  { id: "l3", kind: "listening", prompt: "You hear: “I’m afraid the shop is closed on Mondays.” When can you visit?", choices: ["Any Monday", "Any day except Monday", "Only in the morning", "Only with a friend"], answer: 1, hint: "“Closed on Mondays” leaves the other days." },
];

/** Short gloss used as the spelling hint (kept local so the pool stays self-contained). */
function hintFor(word: string): string {
  const map: Record<string, string> = {
    reliable: "someone you can trust",
    opportunity: "a chance to do something",
    necessary: "needed; required",
    occurred: "happened",
    separate: "apart; not together",
  };
  return map[word] ?? "a common English word";
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** One question per skill every day: vocab + grammar + spelling + reading + listening. Deterministic per date + level. */
const KIND_ORDER: ChallengeKind[] = ["vocab", "grammar", "spelling", "reading", "listening"];

/** Deterministic 5-question set (one per skill). Never exposes answers client-side separately — grading is server-side. */
export function getDailyChallenge(dateKey: string, level: Level | null): DailyChallenge {
  const seed = hashString(`${dateKey}:${level ?? "all"}`);
  // Rotate the kind order so the question sequence varies day to day.
  const kinds = KIND_ORDER.map((_, i) => KIND_ORDER[(seed + i) % KIND_ORDER.length]);
  const picked: ChallengeQuestion[] = kinds.map((kind, ki) => {
    const group = POOL.filter((q) => q.kind === kind);
    const pool = group.length > 0 ? group : POOL;
    return pool[(seed + ki * 7) % pool.length];
  });
  return { dateKey, level: level ?? "mixed", questions: picked, xpPerCorrect: XP_RULES.dailyChallenge.perCorrect, bonusXp: XP_RULES.dailyChallenge.bonus };
}

/** Public (answer-free) version sent to the client. */
export function toPublicChallenge(c: DailyChallenge) {
  return {
    dateKey: c.dateKey,
    level: c.level,
    xpPerCorrect: c.xpPerCorrect,
    bonusXp: c.bonusXp,
    questions: c.questions.map((q) => ({ id: q.id, kind: q.kind, prompt: q.prompt, choices: q.choices, hint: q.hint })),
  };
}

export interface GradeResult {
  score: number;
  total: number;
  correctIds: string[];
  xpEarned: number;
  perfect: boolean;
}

export function gradeDailyChallenge(c: DailyChallenge, answers: Record<string, number>): GradeResult {
  let score = 0;
  const correctIds: string[] = [];
  for (const q of c.questions) {
    const sel = answers[q.id];
    if (Number.isInteger(sel) && sel === q.answer) {
      score += 1;
      correctIds.push(q.id);
    }
  }
  const perfect = score === c.questions.length;
  const xpEarned = xpForGradedSet(c.xpPerCorrect, c.bonusXp, score, c.questions.length);
  return { score, total: c.questions.length, correctIds, xpEarned, perfect };
}
