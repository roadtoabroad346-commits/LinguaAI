/** Placement v3 — multi-skill content. Deterministic, no AI, no I/O.
 * Reuses the existing banks (reading / listening / vocab / writing / speaking /
 * read-aloud) so questions stay consistent with the rest of the app.
 */
import type { Level } from "@/types/database";
import { READING_PASSAGES } from "@/lib/reading/library";
import { LISTENING_TRACKS } from "@/lib/listening/library";
import { VOCAB_BANK } from "@/lib/vocab/bank";
import { misspellings } from "@/lib/spelling/spelling";

export type PlacementSkill =
  | "grammar"
  | "reading"
  | "listening"
  | "spelling"
  | "writing"
  | "speaking"
  | "pronunciation";

export const PLACEMENT_SKILLS: PlacementSkill[] = [
  "grammar",
  "reading",
  "listening",
  "spelling",
  "writing",
  "speaking",
  "pronunciation",
];

export const PLACEMENT_TEST_VERSION = "v3-multi";

export interface PlacementSectionMeta {
  skill: PlacementSkill;
  titleKey: string;
  minutes: number;
}

export const PLACEMENT_SECTION_ORDER: PlacementSectionMeta[] = [
  { skill: "grammar", titleKey: "placement.sections.grammar", minutes: 5 },
  { skill: "reading", titleKey: "placement.sections.reading", minutes: 4 },
  { skill: "listening", titleKey: "placement.sections.listening", minutes: 4 },
  { skill: "spelling", titleKey: "placement.sections.spelling", minutes: 2 },
  { skill: "writing", titleKey: "placement.sections.writing", minutes: 4 },
  { skill: "speaking", titleKey: "placement.sections.speaking", minutes: 2 },
  { skill: "pronunciation", titleKey: "placement.sections.pronunciation", minutes: 2 },
];

export const PLACEMENT_ESTIMATED_MINUTES = PLACEMENT_SECTION_ORDER.reduce(
  (s, x) => s + x.minutes,
  0
);

// ---------- Reading: 3 passages x 2 questions = 6 ----------
export interface PlacementReadingItem {
  passageSlug: string;
  title: string;
  level: Level;
  paragraphs: string[];
  questionId: string;
  prompt: string;
  choices: string[];
}

export function getPlacementReading(): PlacementReadingItem[] {
  const picks: Array<{ slug: string; take: number }> = [
    { slug: "brave-choice", take: 2 },
    { slug: "curious-inventor", take: 2 },
    { slug: "price-of-efficiency", take: 2 },
  ];
  const out: PlacementReadingItem[] = [];
  for (const p of picks) {
    const passage = READING_PASSAGES.find((x) => x.slug === p.slug);
    if (!passage) continue;
    for (const q of passage.questions.slice(0, p.take)) {
      out.push({
        passageSlug: passage.slug,
        title: passage.title,
        level: passage.level,
        paragraphs: passage.paragraphs,
        questionId: q.id,
        prompt: q.prompt,
        choices: q.choices,
      });
    }
  }
  return out;
}

// ---------- Listening: 3 tracks x 2 questions = 6, TTS via browser ----------
export interface PlacementListeningItem {
  trackSlug: string;
  title: string;
  level: Level;
  lines: Array<{ speaker: string; text: string }>;
  questionId: string;
  prompt: string;
  choices: string[];
}

export function getPlacementListening(): PlacementListeningItem[] {
  const picks: Array<{ slug: string; take: number }> = [
    { slug: "at-the-cafe", take: 2 },
    { slug: "weekend-plans", take: 2 },
    { slug: "job-interview-tips", take: 2 },
  ];
  const out: PlacementListeningItem[] = [];
  for (const p of picks) {
    const track = LISTENING_TRACKS.find((x) => x.slug === p.slug);
    if (!track) continue;
    for (const q of track.questions.slice(0, p.take)) {
      out.push({
        trackSlug: track.slug,
        title: track.title,
        level: track.level,
        lines: track.lines,
        questionId: q.id,
        prompt: q.prompt,
        choices: q.choices,
      });
    }
  }
  return out;
}

export function placementListeningSpeakText(
  lines: Array<{ speaker: string; text: string }>
): string {
  return lines.map((l) => l.text).join(" ");
}

// ---------- Spelling: 8 words across A1..C1, 4 choice + 4 typed ----------
export interface PlacementSpellingItem {
  slug: string;
  word: string;
  level: Level;
  definition: string;
  example: string;
  kind: "choice" | "type";
  choices?: string[];
}

const SPELLING_SLUGS: string[] = [
  "journey",
  "weather",
  "receipt",
  "opportunity",
  "deadline",
  "efficient",
  "consequence",
  "resilience",
];

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function getPlacementSpelling(): PlacementSpellingItem[] {
  const out: PlacementSpellingItem[] = [];
  SPELLING_SLUGS.forEach((slug, i) => {
    const entry = VOCAB_BANK.find((w) => w.slug === slug);
    if (!entry) return;
    const kind = i < 4 ? "choice" : "type";
    if (kind === "choice") {
      const choices = seededShuffle(
        [entry.word, ...misspellings(entry.word, 3)],
        hashStr(`placement-spelling:${slug}`) + i * 29
      );
      out.push({
        slug: entry.slug,
        word: entry.word,
        level: entry.level,
        definition: entry.definition,
        example: entry.example,
        kind,
        choices,
      });
    } else {
      out.push({
        slug: entry.slug,
        word: entry.word,
        level: entry.level,
        definition: entry.definition,
        example: entry.example,
        kind,
      });
    }
  });
  return out;
}

// ---------- Writing: one level-neutral task ----------
export const PLACEMENT_WRITING = {
  slug: "placement-weekend",
  title: "My Weekend",
  prompt:
    "Write about what you did last weekend (40–150 words). Where did you go? Who did you see? What did you enjoy? Write in your own words.",
  minWords: 40,
  maxWords: 200,
  tips: [
    "Use past simple (went, saw, enjoyed).",
    "Use time words: first, then, finally.",
    "Check capitals and final punctuation.",
  ],
} as const;

// ---------- Speaking: one prompt, transcript-graded ----------
export const PLACEMENT_SPEAKING = {
  slug: "placement-hobbies",
  title: "My Hobbies",
  prompt:
    "Talk about your hobbies for about 45 seconds (or write 30+ words). What do you enjoy? When do you do it? Why do you like it?",
  questions: [
    "What is your favourite hobby?",
    "When do you usually do it?",
    "Why do you enjoy it?",
  ],
  minWords: 30,
  targetSecs: 45,
  usefulPhrases: ["I enjoy", "In my free time", "Because"],
} as const;

// ---------- Pronunciation: read-aloud match (word accuracy, NOT phonemes) ----------
export const PLACEMENT_PRONUNCIATION = {
  slug: "placement-market-morning",
  title: "Market Morning",
  focus: "clear word match, steady pace",
  text: "The market opens early every Sunday. Farmers sell fresh apples, cheese, and bread. People ask questions, taste the food, and smile. I always buy bread and talk to the baker.",
} as const;
