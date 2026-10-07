/** Phase 2 — deterministic Word of the Day (no AI, no I/O). */
import type { Level } from "@/types/database";

export interface WordOfDay {
  word: string;
  partOfSpeech: string;
  definition: string;
  example: string;
  level: Level;
}

const WORDS: WordOfDay[] = [
  { word: "bright", partOfSpeech: "adjective", definition: "giving out light; intelligent", example: "The bright sun woke us up early.", level: "A1" },
  { word: "journey", partOfSpeech: "noun", definition: "travelling from one place to another", example: "The journey to the mountains took three hours.", level: "A1" },
  { word: "kind", partOfSpeech: "adjective", definition: "friendly and helpful", example: "She is kind to new students.", level: "A1" },
  { word: "achieve", partOfSpeech: "verb", definition: "to reach a goal", example: "He studied hard to achieve his dream.", level: "A2" },
  { word: "brave", partOfSpeech: "adjective", definition: "not afraid of danger", example: "The brave firefighter saved the cat.", level: "A2" },
  { word: "habit", partOfSpeech: "noun", definition: "something you do regularly", example: "Reading every day is a good habit.", level: "A2" },
  { word: "curious", partOfSpeech: "adjective", definition: "wanting to learn new things", example: "Curious students ask great questions.", level: "B1" },
  { word: "opportunity", partOfSpeech: "noun", definition: "a chance to do something", example: "This course is a great opportunity to improve.", level: "B1" },
  { word: "reliable", partOfSpeech: "adjective", definition: "someone you can trust", example: "He is a reliable friend.", level: "B1" },
  { word: "efficient", partOfSpeech: "adjective", definition: "working well without wasting time", example: "A short daily routine is very efficient.", level: "B2" },
  { word: "insight", partOfSpeech: "noun", definition: "a clear understanding of something", example: "The book gave me new insight into history.", level: "B2" },
  { word: "persist", partOfSpeech: "verb", definition: "to continue trying despite problems", example: "If you persist, your English will improve fast.", level: "B2" },
  { word: "eloquent", partOfSpeech: "adjective", definition: "speaking clearly and persuasively", example: "Her eloquent speech impressed everyone.", level: "C1" },
  { word: "meticulous", partOfSpeech: "adjective", definition: "very careful about details", example: "Good writers are meticulous with words.", level: "C1" },
  { word: "resilience", partOfSpeech: "noun", definition: "the ability to recover from difficulties", example: "Learning a language builds resilience.", level: "C1" },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pick: rotates daily, biased toward the learner's level band. */
export function getWordOfDay(dateKey: string, level: Level | null): WordOfDay & { dateKey: string } {
  const lvl = level ?? "A1";
  const levelWords = WORDS.filter((w) => w.level === lvl);
  const pool = levelWords.length > 0 ? levelWords : WORDS;
  const idx = hashString(`${dateKey}:${lvl}`) % pool.length;
  return { ...pool[idx], dateKey };
}

export function getWordPoolSize(): number {
  return WORDS.length;
}
