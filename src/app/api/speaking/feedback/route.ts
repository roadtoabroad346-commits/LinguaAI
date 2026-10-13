import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { getSpeakingTopic, countWords } from "@/lib/speaking/topics";
import { analyzeSpeaking, xpForSpeaking } from "@/lib/speaking/analyze";
import { blendAiScore } from "@/lib/gamification/xp-rules";
import { speakingFeedbackSchema } from "@/lib/speaking/schemas";
import { generateText } from "@/lib/gemini/client";
import { awardXp } from "@/lib/dashboard/award";
import { checkRateLimit } from "@/lib/api/security";
import { claimCompletion } from "@/lib/completions/claims";

function safeParseAiJson(text: string): { score?: number; strengths?: string[]; fixes?: Array<{ issue?: string; example?: string }>; tip?: string; modelAnswer?: string; criteria?: Array<{ key?: string; score?: number; note?: string }>; priorityFix?: string; feedback?: string[] } | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch { return null; }
}

/** Honest AI guard lives in xp-rules (blendAiScore) — route files must export only handlers. */

const CRITERION_KEYS = ["task", "fluency", "delivery", "vocabulary"] as const;

function validAiCriteria(list: Array<{ key?: string; score?: number; note?: string }> | undefined): Array<{ key: string; score: number; note: string }> | null {
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
  // Gemini-backed: strict per-IP limit even for guests (deterministic grade stays free).
  const limited = await checkRateLimit(request, { key: "speaking-feedback", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = speakingFeedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });

  const topic = getSpeakingTopic(parsed.data.topicSlug);
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

  const base = analyzeSpeaking(parsed.data.transcript, { minWords: topic.minWords, durationSecs: parsed.data.durationSecs, level: topic.level });

  // Gemini enhancement: criterion-graded prompt, bounded completion. Deterministic base always returned.
  let ai = false;
  let score = base.score;
  let strengths: string[] = [];
  let modelAnswer = "";
  let feedback = base.feedback;
  let criteria: Array<{ key: string; score: number; note: string }> = base.criteria.map((c) => ({ key: c.key, score: c.score, note: c.note }));
  let priorityFix: string | null = null;

  if (isGeminiConfigured()) {
    const prompt = [
      `Level ${topic.level}. Topic: ${topic.title} — ${topic.prompt}`,
      `Transcript (${base.wordCount} words, ~${parsed.data.durationSecs}s, rule score ${base.score}/100):`,
      parsed.data.transcript.slice(0, 1500),
      `Grade HONESTLY at this level: a weak answer must score low, do not inflate. Reply ONLY with JSON: {"score":0-100,"criteria":[{"key":"task|fluency|delivery|vocabulary","score":0-100,"note":"<=15 words"} x4],"strengths":["<=2 short"],"fixes":[{"issue":"<=15 words","example":"short example"}],"priorityFix":"the single highest-impact fix, <=20 words","tip":"<=20 words","modelAnswer":"2-3 sentence model answer at this level"}. Max 3 fixes, ordered by impact.`,
    ].join("\n");
    try {
      const raw = await generateText(prompt, { systemPrompt: "You are LinguaAI speaking coach. Strict but encouraging examiner at the student's level: honest scores, concrete fixes. JSON only.", maxOutputTokens: 900, temperature: 0.5 });
      const aiJson = safeParseAiJson(raw);
      if (aiJson) {
        ai = true;
        if (typeof aiJson.score === "number" && aiJson.score >= 0 && aiJson.score <= 100) score = blendAiScore(base.score, Math.round(aiJson.score));
        const aiCriteria = validAiCriteria(aiJson.criteria);
        if (aiCriteria) criteria = aiCriteria;
        if (Array.isArray(aiJson.strengths)) strengths = aiJson.strengths.map(String).map((s) => s.slice(0, 200)).filter(Boolean).slice(0, 2);
        if (typeof aiJson.modelAnswer === "string" && aiJson.modelAnswer.trim().length > 10) modelAnswer = aiJson.modelAnswer.trim().slice(0, 600);
        if (typeof aiJson.priorityFix === "string" && aiJson.priorityFix.trim().length > 5) priorityFix = aiJson.priorityFix.trim().slice(0, 220);
        const tips = [
          ...(priorityFix ? [`Fix first: ${priorityFix}`] : []),
          ...(typeof aiJson.tip === "string" && aiJson.tip.trim() ? [aiJson.tip.trim().slice(0, 200)] : []),
        ];
        if (tips.length > 0) feedback = [...tips, ...base.feedback].slice(0, 5);
        if (Array.isArray(aiJson.fixes)) {
          const aiIssues = aiJson.fixes.slice(0, 3).map((f) => ({
            category: "fluency" as const,
            message: String(f.issue ?? "").slice(0, 200),
            example: String(f.example ?? "").slice(0, 200) || undefined,
          })).filter((f) => f.message);
          if (aiIssues.length > 0) base.issues.splice(0, aiIssues.length, ...aiIssues);
        }
      }
    } catch { /* deterministic base stands */ }
  }

  const xpEarned = xpForSpeaking(score);

  let saved = false;
  let streak: unknown = null;
  let xpToday = xpEarned;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id ?? null;
      if (userId) {
        const userLimited = await checkRateLimit(request, { key: "speaking-feedback", limit: 30, scope: userId });
        if (userLimited) return userLimited;
        // Same transcript submitted twice (retry / double-click) counts once.
        const claim = await claimCompletion(supabase, userId, "speaking", parsed.data.idempotencyKey);
        if (!claim.fresh) {
          return NextResponse.json({
            topic: { slug: topic.slug, title: topic.title, level: topic.level, minWords: topic.minWords, targetSecs: topic.targetSecs },
            wordCount: base.wordCount, sentenceCount: base.sentenceCount, wpm: base.wpm,
            fillerCount: base.fillerCount, repetitionCount: base.repetitionCount, uniqueRatio: base.uniqueRatio,
            score, issues: base.issues, strengths, modelAnswer,
            feedback, recommendations: base.recommendations,
            criteria, verdict: base.verdict, priorityFix, timingKnown: base.timingKnown,
            xpEarned: 0, saved: true, repeated: true, streak: null, xpToday: null, ai,
          });
        }
        const { error } = await supabase.from("speaking_attempts").insert({
          user_id: userId, topic_slug: topic.slug, level: topic.level,
          transcript: parsed.data.transcript.slice(0, 3000),
          word_count: countWords(parsed.data.transcript),
          duration_secs: parsed.data.durationSecs,
          score, feedback, xp_earned: xpEarned, ai,
        } as never);
        if (!error) saved = true;
        try {
          const res = await awardXp(supabase, userId, {
            amount: xpEarned, source: "speaking",
            activityKind: "speaking", activityTitle: `Speaking: ${topic.title} — ${score}/100`,
            activityHref: "/speaking",
          });
          streak = res.streak; xpToday = res.xpToday;
        } catch { /* grade stands */ }
      }
    } catch { /* preview mode */ }
  }

  return NextResponse.json({
    topic: { slug: topic.slug, title: topic.title, level: topic.level, minWords: topic.minWords, targetSecs: topic.targetSecs },
    wordCount: base.wordCount, sentenceCount: base.sentenceCount, wpm: base.wpm,
    fillerCount: base.fillerCount, repetitionCount: base.repetitionCount, uniqueRatio: base.uniqueRatio,
    score, issues: base.issues, strengths, modelAnswer,
    feedback, recommendations: base.recommendations,
    criteria, verdict: base.verdict, priorityFix, timingKnown: base.timingKnown,
    xpEarned, saved, streak, xpToday, ai,
  });
}
