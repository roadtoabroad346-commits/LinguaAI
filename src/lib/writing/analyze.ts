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
  /** Per-criterion breakdown (IELTS-style bands) — always present, zero AI tokens. */
  criteria: CriterionScore[];
  /** One honest paragraph: band verdict + the single most important fix. */
  verdict: string;
}

export type CriterionKey = "task" | "coherence" | "vocabulary" | "mechanics";

export interface CriterionScore {
  key: CriterionKey;
  /** 0–100, honestly scaled (a short or error-dense text cannot score high). */
  score: number;
  note: string;
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

export function analyzeWriting(text: string, opts: { minWords: number; maxWords?: number; level?: string }): WritingAnalysis {
  const trimmed = text.trim();
  const wordCount = countWords(trimmed);
  const sentences = splitSentences(trimmed);
  const sentenceCount = sentences.length;
  const avgSentenceLen = sentenceCount > 0 ? wordCount / sentenceCount : 0;
  const errors: WritingError[] = [];

  if (!trimmed) {
    return { wordCount: 0, sentenceCount: 0, avgSentenceLen: 0, errors: [], score: 0, feedback: ["Write at least a few sentences, then check again."], improvedText: "", recommendations: ["Pick a task and aim for its minimum word count."], criteria: emptyCriteria(), verdict: "Nothing to grade yet — write a few sentences first." };
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

  const criteria = gradeWritingCriteria(trimmed, { wordCount, sentenceCount, errors, minWords: opts.minWords, maxWords: opts.maxWords, level: lvl });
  const verdict = writingVerdict(score, criteria);

  return { wordCount, sentenceCount, avgSentenceLen: Math.round(avgSentenceLen * 10) / 10, errors: errors.slice(0, 12), score, feedback: feedback.slice(0, 5), improvedText: autoFix(trimmed), recommendations: recommendations.slice(0, 3), criteria, verdict };
}

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Lexical helpers shared by the criteria below (pure, no tokens). */
function lexicalStats(text: string): { uniqueRatio: number; avgWordLen: number; words: string[] } {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w.length > 0);
  if (words.length === 0) return { uniqueRatio: 0, avgWordLen: 0, words: [] };
  const letters = words.join("").replace(/[^a-z]/g, "").length;
  return { uniqueRatio: new Set(words).size / words.length, avgWordLen: letters / words.length, words };
}

function emptyCriteria(): CriterionScore[] {
  return (["task", "coherence", "vocabulary", "mechanics"] as CriterionKey[]).map((key) => ({ key, score: 0, note: "No text yet." }));
}

/**
 * Honest per-criterion scores from measurable signals only.
 * A criterion can only be high when the text actually demonstrates it:
 * short texts cap task/vocabulary, error-dense texts cap mechanics.
 */
export function gradeWritingCriteria(
  text: string,
  signals: { wordCount: number; sentenceCount: number; errors: WritingError[]; minWords: number; maxWords?: number; level?: string }
): CriterionScore[] {
  const { wordCount, sentenceCount, errors, minWords, maxWords, level } = signals;
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const paragraphs = trimmed.split(/\n+/).map((p) => p.trim()).filter(Boolean).length;
  const { uniqueRatio, avgWordLen } = lexicalStats(trimmed);
  const linkerHits = LINKERS.filter((l) => lower.includes(l));

  // — Task & content: did they write enough, structured in paragraphs? —
  let task = 100;
  const lengthRatio = minWords > 0 ? wordCount / minWords : 1;
  if (lengthRatio < 1) task = 40 + 55 * Math.max(0, lengthRatio); // <minWords can never pass 95
  if (maxWords && wordCount > maxWords) task -= Math.min(25, Math.round(((wordCount - maxWords) / maxWords) * 100));
  if (wordCount >= 80 && paragraphs < 2) task -= 12; // wall of text
  if (wordCount >= 40 && sentenceCount < 3) task -= 10;
  const taskNote =
    lengthRatio < 0.5 ? `Too short (${wordCount}/${minWords} words) — the task is barely started.`
    : lengthRatio < 1 ? `Almost there (${wordCount}/${minWords} words) — add one more idea.`
    : maxWords && wordCount > maxWords ? `Over the limit (${wordCount}/${maxWords}) — cut the weakest sentence.`
    : paragraphs >= 2 ? `Good length and paragraphing (${wordCount} words, ${paragraphs} paragraphs).`
    : `Good length (${wordCount} words). Split into paragraphs as it grows.`;

  // — Coherence & cohesion: linkers + sentence variety + paragraphing —
  const sentLens = trimmed.split(/(?<=[.!?])\s+/).map((s) => countWords(s.trim())).filter((n) => n > 0);
  const mean = sentLens.length > 0 ? sentLens.reduce((a, b) => a + b, 0) / sentLens.length : 0;
  const variance = sentLens.length > 1 ? sentLens.reduce((a, b) => a + (b - mean) ** 2, 0) / sentLens.length : 0;
  const varied = mean > 0 ? Math.sqrt(variance) / mean : 0; // coefficient of variation
  let coherence = 62;
  coherence += Math.min(18, linkerHits.length * 6); // variety of linkers rewards more
  if (varied > 0.35) coherence += 10; // mixed short/long sentences
  else if (sentenceCount >= 3) coherence -= 6; // monotonous
  if (sentenceCount <= 1 && wordCount > 25) coherence -= 18;
  if (wordCount >= 80 && paragraphs >= 2) coherence += 6;
  if (["B1", "B2", "C1"].includes(level ?? "") && linkerHits.length === 0 && wordCount >= 60) coherence -= 12;
  coherence -= Math.min(20, errors.filter((e) => e.category === "punctuation" || e.category === "grammar").length * 4);
  const coherenceNote =
    linkerHits.length === 0 ? "No linking words — join ideas with and / because / for example."
    : linkerHits.length === 1 ? `One linker (${linkerHits[0]}) — add a second type for flow.`
    : `${linkerHits.length} linker types — ideas connect well.`;

  // — Vocabulary: variety + word richness, capped by text length (honest) —
  let vocabulary = 55 + Math.round(Math.min(1, uniqueRatio) * 30);
  if (avgWordLen >= 4.6) vocabulary += 8;
  else if (avgWordLen < 3.8 && wordCount >= 30) vocabulary -= 6;
  const repeats = (trimmed.match(/\b(\w+)\s+\1\b/gi) ?? []).length;
  vocabulary -= Math.min(15, repeats * 5);
  if (wordCount < 30) vocabulary = Math.min(vocabulary, 70); // too little evidence for more
  if (wordCount < 15) vocabulary = Math.min(vocabulary, 55);
  const vocabularyNote =
    uniqueRatio < 0.5 && wordCount >= 30 ? "Many repeated words — swap in a synonym or a topic phrase."
    : avgWordLen >= 4.6 ? "Varied, precise word choice for this level."
    : "Simple but correct words — reuse 2–3 new words from your Dictionary.";

  // — Mechanics: error density per 100 words, weighted by severity —
  const per100 = wordCount > 0 ? (errors.length / wordCount) * 100 : 99;
  const severe = errors.filter((e) => e.category === "grammar" || e.category === "spelling").length;
  let mechanics = 100 - Math.min(70, Math.round(per100 * 9)) - Math.min(15, severe * 2);
  if (wordCount < 20) mechanics = Math.min(mechanics, 75);
  const mechanicsNote =
    errors.length === 0 ? "Clean capitals, spelling and punctuation."
    : `${errors.length} issue${errors.length === 1 ? "" : "s"} in ${wordCount} words — mostly ${topCategory(errors)}. Fix these first.`;

  return [
    { key: "task", score: clamp100(task), note: taskNote },
    { key: "coherence", score: clamp100(coherence), note: coherenceNote },
    { key: "vocabulary", score: clamp100(vocabulary), note: vocabularyNote },
    { key: "mechanics", score: clamp100(mechanics), note: mechanicsNote },
  ];
}

function topCategory(errors: WritingError[]): string {
  const counts = new Map<string, number>();
  for (const e of errors) counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
  let best = "grammar";
  let bestN = -1;
  counts.forEach((n, k) => { if (n > bestN) { best = k; bestN = n; } });
  return best;
}

/** Honest overall verdict: band + weakest criterion + single most important fix. */
export function writingVerdict(score: number, criteria: CriterionScore[]): string {
  const weakest = [...criteria].sort((a, b) => a.score - b.score)[0];
  const band = score >= 85 ? "Strong work" : score >= 70 ? "Solid, with room to grow" : score >= 40 ? "Developing — keep going" : "Needs work — and that is okay";
  return `${band} (${score}/100). Weakest area: ${criterionName(weakest.key)} (${weakest.score}/100) — ${weakest.note}`;
}

function criterionName(key: CriterionKey): string {
  return key === "task" ? "content" : key === "coherence" ? "coherence" : key === "vocabulary" ? "vocabulary" : "mechanics";
}

/** One rewrite style of the improved text (fixed order: faithful → fluent → ambitious). */
export interface RewriteVariant {
  text: string;
}

/**
 * Pick up to 3 valid rewrite variants from AI JSON, falling back to the
 * deterministic corrected text. Pure — unit-tested.
 */
export function pickRewriteVariants(aiVariants: unknown, fallbackText: string): RewriteVariant[] {
  const out: RewriteVariant[] = [];
  if (Array.isArray(aiVariants)) {
    for (const v of aiVariants.slice(0, 3)) {
      const text =
        typeof v === "object" && v !== null
          ? String((v as { text?: unknown }).text ?? "").trim().slice(0, 3000)
          : "";
      if (text.length > 10) out.push({ text });
    }
  }
  if (out.length === 0 && fallbackText.trim().length > 10) {
    out.push({ text: fallbackText.trim().slice(0, 3000) });
  }
  return out;
}

export function xpForWriting(score: number): number {
  return xpFromBands(XP_RULES.bands.productive, score);
}
