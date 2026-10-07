/** Phase 6 — deterministic speaking + read-aloud analysis (zero Gemini tokens). */
import { XP_RULES, xpFromBands } from "@/lib/gamification/xp-rules";

export interface SpeakingIssue {
  category: "fluency" | "vocabulary" | "grammar" | "pronunciation";
  message: string;
  example?: string;
}

export interface SpeakingAnalysis {
  wordCount: number;
  sentenceCount: number;
  wpm: number;
  fillerCount: number;
  repetitionCount: number;
  uniqueRatio: number;
  score: number;
  feedback: string[];
  issues: SpeakingIssue[];
  recommendations: string[];
  modelAnswer: string;
}

export interface ReadAloudAnalysis {
  wordCount: number;
  passageWords: number;
  matchedWords: number;
  accuracy: number;
  wpm: number;
  missedWords: string[];
  extraCount: number;
  score: number;
  feedback: string[];
}

const FILLERS = ["um", "uh", "er", "ah", "hmm", "mmm"];
const FILLER_PHRASES = ["you know", "i mean", "like i said"];
const LINKERS = ["and", "but", "because", "however", "for example", "although", "so", "then", "first", "finally", "in my opinion", "on the other hand", "in conclusion", "whereas", "nevertheless"];

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, "").replace(/-+/g, "-"))
    .filter(Boolean);
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function analyzeSpeaking(
  transcript: string,
  opts: { minWords: number; durationSecs: number; level?: string }
): SpeakingAnalysis {
  const trimmed = transcript.trim();
  const words = normalizeWords(trimmed);
  const wordCount = words.length;
  const sentences = splitSentences(trimmed);
  const sentenceCount = sentences.length;
  const durationSecs = Math.max(0, Math.min(3600, Math.round(opts.durationSecs || 0)));
  const wpm = durationSecs >= 5 ? Math.round((wordCount / durationSecs) * 60) : 0;

  if (!trimmed || wordCount < 3) {
    return {
      wordCount, sentenceCount, wpm, fillerCount: 0, repetitionCount: 0, uniqueRatio: 0,
      score: 10,
      feedback: ["Record or type at least a few sentences, then check again."],
      issues: [],
      recommendations: ["Pick an easier topic and aim for its minimum word count."],
      modelAnswer: "",
    };
  }

  // Fillers.
  let fillerCount = 0;
  for (const w of words) if (FILLERS.includes(w)) fillerCount++;
  const lower = trimmed.toLowerCase();
  for (const p of FILLER_PHRASES) {
    const m = lower.match(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"));
    if (m) fillerCount += m.length;
  }

  // Repeated adjacent words.
  let repetitionCount = 0;
  for (let i = 1; i < words.length; i++) if (words[i] === words[i - 1]) repetitionCount++;

  const uniqueRatio = wordCount > 0 ? new Set(words).size / wordCount : 0;

  const issues: SpeakingIssue[] = [];
  if (wordCount < opts.minWords) {
    issues.push({ category: "fluency", message: `Quite short (${wordCount}/${opts.minWords} words) — add one more reason or example.`, example: "Try: '…because…' / 'For example…'" });
  }
  if (fillerCount >= 3) {
    issues.push({ category: "fluency", message: `${fillerCount} filler sounds (um/uh/you know) — pause silently instead.`, example: "Replace 'um' with a 1-second pause." });
  }
  if (repetitionCount >= 2) {
    issues.push({ category: "fluency", message: "Repeated words detected — slow down slightly and plan the next word.", example: "the the → the" });
  }
  if (uniqueRatio < 0.45 && wordCount >= 30) {
    issues.push({ category: "vocabulary", message: "Many repeated words — reuse a synonym or a useful phrase from the topic.", example: "good → great / enjoyable / useful" });
  }
  const hasLinker = LINKERS.some((l) => lower.includes(l));
  if (!hasLinker && wordCount >= 40) {
    issues.push({ category: "grammar", message: "No linking words — join ideas with and / because / for example.", example: "I like it because…" });
  }
  if (sentenceCount <= 1 && wordCount > 30) {
    issues.push({ category: "fluency", message: "One long run — break it into shorter sentences with pauses." });
  }
  if (/\bi\b/.test(trimmed)) {
    issues.push({ category: "pronunciation", message: "Remember: the pronoun 'I' is always capital in writing — and stressed clearly in speech." });
  }

  // Score: start 100, penalties.
  let score = 100;
  const deficit = opts.minWords - wordCount;
  if (deficit > 0) score -= Math.min(35, Math.round(deficit * 0.7));
  score -= Math.min(15, fillerCount * 3);
  score -= Math.min(10, repetitionCount * 4);
  if (uniqueRatio < 0.45 && wordCount >= 30) score -= 6;
  if (!hasLinker && wordCount >= 40) score -= 5;
  if (wpm > 0 && wpm < 50) score -= 8;
  if (wpm > 190) score -= 6;
  score = Math.max(10, Math.min(96, Math.round(score)));

  const feedback: string[] = [];
  if (wordCount >= opts.minWords) feedback.push(`Good length — ${wordCount} words${durationSecs > 0 ? ` in ~${durationSecs}s (${wpm} wpm)` : ""}.`);
  else feedback.push(`${wordCount}/${opts.minWords} words — speak a little longer next try.`);
  if (wpm > 0) {
    if (wpm < 70) feedback.push("Pace is slow — that is fine for clarity; try slightly longer phrases.");
    else if (wpm <= 170) feedback.push("Natural pace — easy to understand.");
    else feedback.push("Very fast — slow down so each word is clear.");
  }
  if (fillerCount === 0) feedback.push("No filler sounds — fluent delivery.");
  else if (fillerCount <= 2) feedback.push("Only a couple of fillers — good control.");
  if (uniqueRatio >= 0.6 && wordCount >= 20) feedback.push("Varied vocabulary — keep collecting new words in your Dictionary.");

  const recommendations: string[] = [];
  if (fillerCount >= 3) recommendations.push("Re-record the same topic once, pausing silently instead of um/uh.");
  if (uniqueRatio < 0.5 && wordCount >= 20) recommendations.push("Save 3 new words from this topic to your Dictionary, then reuse them.");
  if (!hasLinker) recommendations.push("Practise linking words in Grammar, then say the answer again with 'because'.");
  if (score >= 80) recommendations.push("Challenge: answer the next follow-up question without stopping.");
  if (recommendations.length === 0) recommendations.push("Try the next topic one level up, or Read Aloud for pronunciation.");

  return {
    wordCount, sentenceCount, wpm, fillerCount, repetitionCount,
    uniqueRatio: Math.round(uniqueRatio * 100) / 100,
    score, feedback: feedback.slice(0, 4), issues: issues.slice(0, 6),
    recommendations: recommendations.slice(0, 3), modelAnswer: "",
  };
}

export function xpForSpeaking(score: number): number {
  return xpFromBands(XP_RULES.bands.productive, score);
}

/** Ordered greedy match of transcript against passage (tolerates extra words). */
export function analyzeReadAloud(
  passage: string,
  transcript: string,
  durationSecs: number
): ReadAloudAnalysis {
  const pWords = normalizeWords(passage);
  const tWords = normalizeWords(transcript);
  const duration = Math.max(0, Math.min(3600, Math.round(durationSecs || 0)));
  const wpm = duration >= 5 && tWords.length > 0 ? Math.round((tWords.length / duration) * 60) : 0;

  if (tWords.length === 0 || pWords.length === 0) {
    return { wordCount: tWords.length, passageWords: pWords.length, matchedWords: 0, accuracy: 0, wpm, missedWords: pWords.slice(0, 12), extraCount: 0, score: 10, feedback: ["Read the passage aloud, then check again."] };
  }

  // Greedy ordered matching: walk transcript, advance passage pointer.
  let pi = 0;
  let matched = 0;
  const missed: string[] = [];
  const windowSearch = 6;
  for (const tw of tWords) {
    let found = -1;
    for (let k = pi; k < Math.min(pWords.length, pi + windowSearch + 1); k++) {
      if (pWords[k] === tw) { found = k; break; }
    }
    if (found >= 0) {
      for (let k = pi; k < found; k++) missed.push(pWords[k]);
      matched++;
      pi = found + 1;
    }
  }
  for (let k = pi; k < pWords.length; k++) missed.push(pWords[k]);

  const accuracy = pWords.length > 0 ? Math.round((matched / pWords.length) * 100) : 0;
  const extraCount = Math.max(0, tWords.length - matched);

  let score = Math.round(accuracy * 0.85);
  if (accuracy >= 95) score += 10;
  else if (wpm >= 80 && wpm <= 170) score += 10;
  else if (wpm >= 60 && wpm < 80) score += 5;
  else if (wpm > 170 && wpm <= 210) score += 4;
  if (extraCount > pWords.length * 0.3) score -= 8;
  score = Math.max(10, Math.min(98, score));

  const feedback: string[] = [];
  if (accuracy >= 90) feedback.push(`Excellent reading — ${accuracy}% of words matched.`);
  else if (accuracy >= 70) feedback.push(`Good — ${accuracy}% matched. Re-read the missed words below.`);
  else feedback.push(`Only ${accuracy}% matched — read slower and pronounce each word.`);
  if (wpm > 0) {
    if (wpm < 70) feedback.push("Slow pace — good for accuracy; try a slightly steadier rhythm.");
    else if (wpm <= 170) feedback.push("Natural reading pace.");
    else feedback.push("Too fast — slow down to avoid skipping words.");
  }
  if (extraCount > 8) feedback.push("Many extra words — stick to the text, don't improvise.");

  return {
    wordCount: tWords.length, passageWords: pWords.length, matchedWords: matched,
    accuracy, wpm, missedWords: Array.from(new Set(missed)).slice(0, 12),
    extraCount, score, feedback: feedback.slice(0, 4),
  };
}
