import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/api/security";
import { getWritingTask } from "@/lib/writing/tasks";
import { analyzeWriting, xpForWriting, type WritingError } from "@/lib/writing/analyze";
import { blendAiScore } from "@/lib/gamification/xp-rules";
import { writingCheckSchema } from "@/lib/writing/schemas";
import { generateText } from "@/lib/gemini/client";
import { awardXp } from "@/lib/dashboard/award";

interface AiCorrection { original?: string; corrected?: string; explanation?: string; category?: string }
interface AiCriterion { key?: string; score?: number; note?: string }

function safeParseAiJson(text: string): { score?: number; corrections?: AiCorrection[]; improvedText?: string; feedback?: string[]; criteria?: AiCriterion[]; strengths?: string[]; priorityFix?: string } | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch { return null; }
}

/** Honest AI guard: blend the AI score 50/50 with the deterministic rule score,
 *  so a generous model cannot inflate a weak text (or crush a clean one). */

const CRITERION_KEYS = ["task", "coherence", "vocabulary", "mechanics"] as const;

function validAiCriteria(list: AiCriterion[] | undefined): Array<{ key: string; score: number; note: string }> | null {
  if (!Array.isArray(list) || list.length !== 4) return null;
  const out: Array<{ key: string; score: number; note: string }> = [];
  for (const c of list) {
    const key = String(c.key ?? "");
    const score = Number(c.score);
    if (!CRITERION_KEYS.includes(key as (typeof CRITERION_KEYS)[number])) return null;
    if (!Number.isFinite(score) || score < 0 || score > 100) return null;
    out.push({ key, score: Math.round(score), note: String(c.note ?? "").slice(0, 160) });
  }
  if (new Set(out.map((c) => c.key)).size !== 4) return null;
  return out;
}

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { key: "writing-check", limit: 10, windowMs: 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = writingCheckSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });

  const task = getWritingTask(parsed.data.taskSlug);
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });

  const base = analyzeWriting(parsed.data.text, { minWords: task.minWords, level: task.level });

  // Gemini enhancement: criterion-graded prompt, bounded completion. Deterministic base always returned.
  let ai = false;
  let corrections: Array<{ original: string; corrected: string; explanation: string; category: string }> = [];
  let improvedText = base.improvedText;
  let score = base.score;
  let feedback = base.feedback;
  let criteria: Array<{ key: string; score: number; note: string }> = base.criteria.map((c) => ({ key: c.key, score: c.score, note: c.note }));
  let strengths: string[] = [];
  let priorityFix: string | null = null;

  if (isGeminiConfigured()) {
    const prompt = [
      `Level ${task.level}. Task: ${task.title} — ${task.prompt}`,
      `Student text (${base.wordCount} words, rule score ${base.score}/100):`,
      parsed.data.text.slice(0, 2000),
      `Grade HONESTLY at this level: a weak text must score low, do not inflate. Reply ONLY with JSON: {"score":0-100,"criteria":[{"key":"task|coherence|vocabulary|mechanics","score":0-100,"note":"<=15 words"} x4],"corrections":[{"original":"...","corrected":"...","explanation":"<=15 words","category":"grammar|spelling|punctuation|vocabulary|style"}],"strengths":["<=2 short"],"priorityFix":"the single highest-impact fix, <=20 words","improvedText":"corrected full text, same meaning","feedback":["<=3 short tips"]}. Max 8 corrections, ordered by impact.`,
    ].join("\n");
    try {
      const raw = await generateText(prompt, { systemPrompt: "You are LinguaAI writing coach. Strict but kind examiner at the student's level: honest scores, concrete fixes. JSON only.", maxOutputTokens: 1100, temperature: 0.4 });
      const aiJson = safeParseAiJson(raw);
      if (aiJson) {
        ai = true;
        if (typeof aiJson.score === "number" && aiJson.score >= 0 && aiJson.score <= 100) score = blendAiScore(base.score, Math.round(aiJson.score));
        const aiCriteria = validAiCriteria(aiJson.criteria);
        if (aiCriteria) criteria = aiCriteria;
        if (Array.isArray(aiJson.corrections)) {
          corrections = aiJson.corrections.slice(0, 8).map((c) => ({
            original: String(c.original ?? "").slice(0, 200),
            corrected: String(c.corrected ?? "").slice(0, 200),
            explanation: String(c.explanation ?? "").slice(0, 200),
            category: ["grammar", "spelling", "punctuation", "vocabulary", "style"].includes(String(c.category)) ? String(c.category) : "grammar",
          })).filter((c) => c.original && c.corrected);
        }
        if (typeof aiJson.improvedText === "string" && aiJson.improvedText.trim().length > 10) improvedText = aiJson.improvedText.trim().slice(0, 3000);
        if (Array.isArray(aiJson.strengths)) strengths = aiJson.strengths.map(String).map((s) => s.slice(0, 200)).filter(Boolean).slice(0, 2);
        if (typeof aiJson.priorityFix === "string" && aiJson.priorityFix.trim().length > 5) priorityFix = aiJson.priorityFix.trim().slice(0, 220);
        const tips = Array.isArray(aiJson.feedback) ? aiJson.feedback.slice(0, 3).map(String) : [];
        feedback = [...(priorityFix ? [`Fix first: ${priorityFix}`] : []), ...tips, ...base.feedback].slice(0, 5);
      }
    } catch { /* deterministic base stands */ }
  }

  // Merge deterministic errors into corrections shape when AI gave none.
  if (corrections.length === 0) {
    corrections = base.errors.slice(0, 6).map((e: WritingError) => ({
      original: e.snippet, corrected: e.suggestion ?? "", explanation: e.message, category: e.category,
    }));
  }

  const xpEarned = xpForWriting(score);

  // Persist for signed-in users (best-effort).
  let saved = false;
  let streak: unknown = null;
  let xpToday = xpEarned;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (userId) {
        const { data: sub } = await supabase.from("writing_submissions").insert({
          user_id: userId, task_slug: task.slug, level: task.level, text: parsed.data.text.slice(0, 3000),
          word_count: base.wordCount, score, feedback, improved_text: improvedText, xp_earned: xpEarned, ai,
        } as never).select("id").maybeSingle();
        const subId = (sub as { id?: string } | null)?.id;
        if (subId) {
          const rows = base.errors.slice(0, 12).map((e) => ({ user_id: userId, submission_id: subId, category: e.category, message: e.message, snippet: e.snippet.slice(0, 300) }));
          if (rows.length > 0) await supabase.from("writing_errors").insert(rows as never);
          saved = true;
        }
        try {
          const res = await awardXp(supabase, userId, {
            amount: xpEarned, source: "writing",
            activityKind: "writing", activityTitle: `Writing: ${task.title} — ${score}/100`,
            activityHref: "/writing",
          });
          streak = res.streak; xpToday = res.xpToday;
        } catch { /* grade stands */ }
      }
    } catch { /* preview mode */ }
  }

  return NextResponse.json({
    task: { slug: task.slug, title: task.title, level: task.level, minWords: task.minWords, maxWords: task.maxWords },
    wordCount: base.wordCount, sentenceCount: base.sentenceCount, avgSentenceLen: base.avgSentenceLen,
    score, corrections, improvedText, feedback, recommendations: base.recommendations,
    errorCount: base.errors.length, errorsByCategory: countBy(base.errors.map((e) => e.category)),
    criteria, verdict: base.verdict, strengths, priorityFix,
    xpEarned, saved, streak, xpToday, ai,
  });
}

function countBy(cats: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cats) out[c] = (out[c] ?? 0) + 1;
  return out;
}
