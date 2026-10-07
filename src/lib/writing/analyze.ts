/** Phase 5 — deterministic writing analysis (zero Gemini tokens). */
import { countWords } from "./tasks";
import { XP_RULES, xpFromBands } from "@/lib/gamification/xp-rules";

export type ErrorCategory = "spelling" | "grammar" | "punctuation" | "style" | "vocabulary";

export interface WritingError {
  category: ErrorCategory;
  message: string;
  snippet: string;
  suggestion?: string;
}

export interface WritingAnalysis {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLen: number;
  errors: WritingError[];
  score: number;
  feedback: string[];
  improvedText: string;
  recommendations: string[];
}

const MISSPELLINGS: Array<[RegExp, string, string]> = [
  [/\bteh\b/gi, "teh", "the"],
  [/\brecieve\b/gi, "recieve", "receive"],
  [/\badress\b/gi, "adress", "address"],
  [/\boccured\b/gi, "occured", "occurred"],
  [/\bseperate\b/gi, "seperate", "separate"],
  [/\bdefinately\b/gi, "definately", "definitely"],
  [/\bwich\b/gi, "wich", "which"],
  [/\bthier\b/gi, "thier", "their"],
  [/\bexersice\b/gi, "exersice", "exercise"],
  [/\blern\b/gi, "lern", "learn"],
];

const LINKERS = ["however", "moreover", "furthermore", "although", "because", "therefore", "for example", "in my opinion", "on the other hand", "in conclusion"];

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

function autoFix(text: string): string {
  let out = text.replace(/[ \t]{2,}/g, " ").replace(/\s+\n/g, "\n").trim();
  out = out.replace(/\bi\b/g, "I");
  for (const [re, , fix] of MISSPELLINGS) out = out.replace(re, fix);
  out = out.replace(/(\w) ,/g, "$1,");
  out = out.replace(/\s+([.!?])/g, "$1");
  // Capitalize sentence starts.
  out = out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
  if (out && !/[.!?]$/.test(out)) out += ".";
  return out;
}

export function analyzeWriting(text: string, opts: { minWords: number; level?: string }): WritingAnalysis {
  const trimmed = text.trim();
  const wordCount = countWords(trimmed);
  const sentences = splitSentences(trimmed);
  const sentenceCount = sentences.length;
  const avgSentenceLen = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const errors: WritingError[] = [];

  if (!trimmed) {
    return { wordCount: 0, sentenceCount: 0, avgSentenceLen: 0, errors: [], score: 0, feedback: ["Write at least a few sentences, then check again."], improvedText: "", recommendations: ["Pick a task and aim for its minimum word count."] };
  }

  // Repeated words.
  const rep = trimmed.match(/\b(\w+)\s+\1\b/gi);
  if (rep) for (const r of rep.slice(0, 3)) errors.push({ category: "grammar", message: "Repeated word.", snippet: r, suggestion: `Keep only one: “${r.split(/\s+/)[0]}”.` });

  // Double spaces.
  if (/ {2,}/.test(text)) errors.push({ category: "punctuation", message: "Extra spaces between words.", snippet: "  (double space)", suggestion: "Use single spaces." });

  // Lowercase sentence starts.
  sentences.slice(0, 8).forEach((s) => {
    if (/^[a-z]/.test(s)) errors.push({ category: "grammar", message: "Sentence should start with a capital letter.", snippet: s.slice(0, 40) + (s.length > 40 ? "…" : "") });
  });

  // Missing final punctuation.
  if (!/[.!?]$/.test(trimmed)) errors.push({ category: "punctuation", message: "Text does not end with punctuation.", snippet: trimmed.slice(-40), suggestion: "End with a period." });

  // Lowercase standalone i.
  if (/\bi\b/.test(trimmed)) errors.push({ category: "grammar", message: "The pronoun “I” is always capital.", snippet: "i → I", suggestion: "Capitalize every “i” that means yourself." });

  // Misspellings.
  for (const [re, wrong, fix] of MISSPELLINGS) {
    if (re.test(trimmed)) { errors.push({ category: "spelling", message: `Possible spelling mistake: “${wrong}”.`, snippet: wrong, suggestion: `Use “${fix}”.` }); break; }
  }

  // Long run-on sentences.
  sentences.forEach((s) => {
    const n = countWords(s);
    if (n > 28) errors.push({ category: "style", message: `Very long sentence (${n} words) — consider splitting it.`, snippet: s.slice(0, 50) + "…" });
  });

  // Very short text / single sentence.
  if (sentenceCount <= 1 && wordCount > 25) errors.push({ category: "style", message: "Only one sentence — break ideas into several sentences.", snippet: trimmed.slice(0, 50) + "…" });

  // Linking words (B1+).
  const lvl = opts.level ?? "A2";
  const needsLinkers = ["B1", "B2", "C1"].includes(lvl);
  const hasLinker = LINKERS.some((l) => trimmed.toLowerCase().includes(l));
  if (needsLinkers && wordCount >= 60 && !hasLinker) errors.push({ category: "vocabulary", message: "No linking words found — add however / for example / in conclusion.", snippet: "linking words", suggestion: "Add 1–2 linkers to connect ideas." });

  // Score.
  let score = 100;
  for (const e of errors) score -= e.category === "spelling" ? 4 : e.category === "style" || e.category === "vocabulary" ? 3 : 6;
  const deficit = opts.minWords - wordCount;
  if (deficit > 0) score -= Math.min(30, Math.round(deficit * 0.6));
  if (wordCount < 20) score -= 15;
  score = Math.max(10, Math.min(96, Math.round(score)));

  const feedback: string[] = [];
  if (wordCount < opts.minWords) feedback.push(`Aim for at least ${opts.minWords} words — you have ${wordCount}. Add one more reason or example.`);
  else feedback.push(`Good length (${wordCount} words in ${sentenceCount} sentence${sentenceCount === 1 ? "" : "s"}).`);
  if (avgSentenceLen > 0 && avgSentenceLen < 6) feedback.push("Sentences are very short — try joining two ideas with and / because / but.");
  if (avgSentenceLen > 24) feedback.push("Sentences run long — split one long sentence into two.");
  if (errors.length === 0) feedback.push("No basic errors found. For style and richer vocabulary, use Check with AI.");
  if (errors.some((e) => e.category === "spelling")) feedback.push("Check spelling of flagged words, then re-read once aloud.");
  if (errors.some((e) => e.category === "punctuation")) feedback.push("Fix capitals and final punctuation first — they are the fastest wins.");

  const recommendations: string[] = [];
  if (errors.some((e) => e.category === "spelling")) recommendations.push("Practise flagged words in Spelling, then save them to your Dictionary.");
  if (errors.some((e) => e.category === "grammar")) recommendations.push("Review the matching Grammar topic (capitals, present/past simple) and retake its quiz.");
  if (errors.some((e) => e.category === "vocabulary" || e.category === "style")) recommendations.push("Read one Reading article at your level and note 3 linking words to reuse.");
  if (score >= 80) recommendations.push("Challenge yourself: rewrite with one longer sentence using although / because.");

  return { wordCount, sentenceCount, avgSentenceLen: Math.round(avgSentenceLen * 10) / 10, errors: errors.slice(0, 12), score, feedback: feedback.slice(0, 5), improvedText: autoFix(trimmed), recommendations: recommendations.slice(0, 3) };
}

export function xpForWriting(score: number): number {
  return xpFromBands(XP_RULES.bands.productive, score);
}
