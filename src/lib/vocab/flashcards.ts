/**
 * Flashcard study helpers — pure, deterministic, test-covered.
 * Powers the flip / write / choice / listen modes plus
 * shuffle, direction and favorite filtering in FlashcardRunner.
 */

export type FlashMode = "flip" | "write" | "choice" | "listen";
export type FlashDirection = "word-def" | "def-word" | "mixed";

export interface FlashCard {
  slug: string;
  word: string;
  definition: string;
  example: string;
  phonetic: string;
  partOfSpeech: string;
  level: string;
  mastery: number;
}

export const FLASH_MODES: FlashMode[] = ["flip", "write", "choice", "listen"];
export const FLASH_DIRECTIONS: FlashDirection[] = ["word-def", "def-word", "mixed"];

/** Deterministic PRNG (mulberry32) so shuffles are stable per seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable shuffle — same seed returns the same order (used for "shuffle" + tests). */
export function shuffleDeck<T>(cards: T[], seedKey: string): T[] {
  const rand = seededRandom(hashSeed(seedKey));
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Front/back for a card under a direction.
 * "mixed" alternates by index so a session trains both directions.
 */
export function cardSides(
  card: FlashCard,
  direction: FlashDirection,
  index: number
): { front: string; frontHint: string; back: string; backHint: string } {
  const reversed = direction === "def-word" || (direction === "mixed" && index % 2 === 1);
  if (!reversed) {
    return {
      front: card.word,
      frontHint: `${card.phonetic} · ${card.partOfSpeech}`,
      back: card.definition,
      backHint: card.example,
    };
  }
  return {
    front: card.definition,
    frontHint: "What word is this?",
    back: card.word,
    backHint: `${card.phonetic} · ${card.example}`,
  };
}

/** 4-option multiple-choice distractors drawn from the same deck (deterministic). */
export function buildChoices(card: FlashCard, deck: FlashCard[]): { options: string[]; answer: number } {
  const pool = deck.filter((c) => c.slug !== card.slug).map((c) => c.definition);
  const distractors: string[] = [];
  for (const d of pool) {
    if (!distractors.includes(d) && d !== card.definition) distractors.push(d);
    if (distractors.length === 3) break;
  }
  while (distractors.length < 3) distractors.push(`(review: ${card.word} — see example)`);
  const rand = seededRandom(hashSeed(card.slug));
  const answer = Math.floor(rand() * 4);
  const options = [...distractors];
  options.splice(answer, 0, card.definition);
  return { options: options.slice(0, 4), answer };
}

/** Forgiving typed-answer grading: lowercase, trim, strip punctuation. */
export function normaliseTyped(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9'\s-]/g, "").replace(/\s+/g, " ").trim();
}

export function gradeTyped(expected: string, typed: string): boolean {
  const a = normaliseTyped(expected);
  const b = normaliseTyped(typed);
  return a.length > 0 && a === b;
}
