import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/api/security";
import { getWritingTask } from "@/lib/writing/tasks";
import { analyzeWriting, xpForWriting, type WritingError } from "@/lib/writing/analyze";
import { writingCheckSchema } from "@/lib/writing/schemas";
import { generateText } from "@/lib/gemini/client";
import { awardXp } from "@/lib/dashboard/award";

interface AiCorrection { original?: string; corrected?: string; explanation?: string; category?: string }

function safeParseAiJson(text: string): { score?: number; corrections?: AiCorrection[]; improvedText?: string; feedback?: string[] } | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch { return null; }
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

  // Gemini enhancement: compact prompt, small completion. Deterministic base always returned.
  let ai = false;
  let corrections: Array<{ original: string; corrected: string; explanation: string; category: string }> = [];
  let improvedText = base.improvedText;
  let score = base.score;
  let feedback = base.feedback;

  if (isGeminiConfigured()) {
    const prompt = [
      `Level ${task.level}. Task: ${task.title} — ${task.prompt}`,
      `Student text (${base.wordCount} words):`,
      parsed.data.text.slice(0, 2000),
      `Reply ONLY with JSON: {"score":0-100,"corrections":[{"original":"...","corrected":"...","explanation":"<=12 words","category":"grammar|spelling|punctuation|vocabulary|style"}],"improvedText":"corrected full text, same meaning","feedback":["<=2 short tips"]}. Max 6 corrections.`,
    ].join("\n");
    try {
      const raw = await generateText(prompt, { systemPrompt: "You are LinguaAI writing coach. Correct gently at the student's level. JSON only.", maxOutputTokens: 700, temperature: 0.4 });
      const aiJson = safeParseAiJson(raw);
      if (aiJson) {
        ai = true;
        if (typeof aiJson.score === "number" && aiJson.score >= 0 && aiJson.score <= 100) score = Math.round(aiJson.score);
        if (Array.isArray(aiJson.corrections)) {
          corrections = aiJson.corrections.slice(0, 6).map((c) => ({
            original: String(c.original ?? "").slice(0, 200),
            corrected: String(c.corrected ?? "").slice(0, 200),
            explanation: String(c.explanation ?? "").slice(0, 200),
            category: ["grammar", "spelling", "punctuation", "vocabulary", "style"].includes(String(c.category)) ? String(c.category) : "grammar",
          })).filter((c) => c.original && c.corrected);
        }
        if (typeof aiJson.improvedText === "string" && aiJson.improvedText.trim().length > 10) improvedText = aiJson.improvedText.trim().slice(0, 3000);
        if (Array.isArray(aiJson.feedback) && aiJson.feedback.length > 0) feedback = [...aiJson.feedback.slice(0, 2).map(String), ...base.feedback].slice(0, 4);
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
    xpEarned, saved, streak, xpToday, ai,
  });
}

function countBy(cats: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of cats) out[c] = (out[c] ?? 0) + 1;
  return out;
}
