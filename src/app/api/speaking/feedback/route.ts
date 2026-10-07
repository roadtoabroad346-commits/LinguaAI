import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { getSpeakingTopic, countWords } from "@/lib/speaking/topics";
import { analyzeSpeaking, xpForSpeaking } from "@/lib/speaking/analyze";
import { speakingFeedbackSchema } from "@/lib/speaking/schemas";
import { generateText } from "@/lib/gemini/client";
import { awardXp } from "@/lib/dashboard/award";

function safeParseAiJson(text: string): { score?: number; strengths?: string[]; fixes?: Array<{ issue?: string; example?: string }>; tip?: string; modelAnswer?: string } | null {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch { return null; }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = speakingFeedbackSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });

  const topic = getSpeakingTopic(parsed.data.topicSlug);
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

  const base = analyzeSpeaking(parsed.data.transcript, { minWords: topic.minWords, durationSecs: parsed.data.durationSecs, level: topic.level });

  // Gemini enhancement: compact prompt, small completion. Deterministic base always returned.
  let ai = false;
  let score = base.score;
  let strengths: string[] = [];
  let modelAnswer = "";
  let feedback = base.feedback;

  if (isGeminiConfigured()) {
    const prompt = [
      `Level ${topic.level}. Topic: ${topic.title} — ${topic.prompt}`,
      `Transcript (${base.wordCount} words, ~${parsed.data.durationSecs}s):`,
      parsed.data.transcript.slice(0, 1500),
      `Reply ONLY with JSON: {"score":0-100,"strengths":["<=2 short"],"fixes":[{"issue":"<=12 words","example":"short example"}],"tip":"<=20 words","modelAnswer":"2-3 sentence model answer at this level"}. Max 3 fixes.`,
    ].join("\n");
    try {
      const raw = await generateText(prompt, { systemPrompt: "You are LinguaAI speaking coach. Encourage, correct gently at the student's level. JSON only.", maxOutputTokens: 550, temperature: 0.5 });
      const aiJson = safeParseAiJson(raw);
      if (aiJson) {
        ai = true;
        if (typeof aiJson.score === "number" && aiJson.score >= 0 && aiJson.score <= 100) score = Math.round(aiJson.score);
        if (Array.isArray(aiJson.strengths)) strengths = aiJson.strengths.map(String).slice(0, 2);
        if (typeof aiJson.modelAnswer === "string" && aiJson.modelAnswer.trim().length > 10) modelAnswer = aiJson.modelAnswer.trim().slice(0, 600);
        if (typeof aiJson.tip === "string" && aiJson.tip.trim()) feedback = [aiJson.tip.trim().slice(0, 200), ...base.feedback].slice(0, 4);
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
    xpEarned, saved, streak, xpToday, ai,
  });
}
