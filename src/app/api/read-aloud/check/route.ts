import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { getReadAloudPassage } from "@/lib/readaloud/passages";
import { analyzeReadAloud, xpForSpeaking } from "@/lib/speaking/analyze";
import { readAloudCheckSchema } from "@/lib/speaking/schemas";
import { generateText } from "@/lib/gemini/client";
import { awardXp } from "@/lib/dashboard/award";

function safeParseAiJson(text: string): { score?: number; tip?: string; hardWords?: string[] } | null {
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
  const parsed = readAloudCheckSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission.", issues: parsed.error.flatten() }, { status: 400 });

  const passage = getReadAloudPassage(parsed.data.passageSlug);
  if (!passage) return NextResponse.json({ error: "Passage not found." }, { status: 404 });

  const base = analyzeReadAloud(passage.text, parsed.data.transcript, parsed.data.durationSecs);

  let ai = false;
  let score = base.score;
  let feedback = base.feedback;
  let hardWords: string[] = [];

  if (isGeminiConfigured()) {
    const prompt = [
      `Level ${passage.level}. Passage: "${passage.text.slice(0, 800)}"`,
      `Student read (${base.wordCount} words): "${parsed.data.transcript.slice(0, 1200)}"`,
      `Accuracy ${base.accuracy}%. Reply ONLY with JSON: {"score":0-100,"tip":"<=20 words pronunciation tip","hardWords":["<=5 words likely mispronounced"]}.`,
    ].join("\n");
    try {
      const raw = await generateText(prompt, { systemPrompt: "You are LinguaAI pronunciation coach. JSON only.", maxOutputTokens: 300, temperature: 0.4 });
      const aiJson = safeParseAiJson(raw);
      if (aiJson) {
        ai = true;
        if (typeof aiJson.score === "number" && aiJson.score >= 0 && aiJson.score <= 100) score = Math.round(aiJson.score);
        if (typeof aiJson.tip === "string" && aiJson.tip.trim()) feedback = [aiJson.tip.trim().slice(0, 200), ...base.feedback].slice(0, 4);
        if (Array.isArray(aiJson.hardWords)) hardWords = aiJson.hardWords.map(String).slice(0, 5);
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
        const { error } = await supabase.from("read_aloud_attempts").insert({
          user_id: userId, passage_slug: passage.slug, level: passage.level,
          transcript: parsed.data.transcript.slice(0, 3000),
          accuracy: base.accuracy, wpm: base.wpm, score,
          missed_words: base.missedWords, xp_earned: xpEarned, ai,
        } as never);
        if (!error) saved = true;
        try {
          const res = await awardXp(supabase, userId, {
            amount: xpEarned, source: "read_aloud",
            activityKind: "speaking", activityTitle: `Read Aloud: ${passage.title} — ${base.accuracy}%`,
            activityHref: "/speaking",
          });
          streak = res.streak; xpToday = res.xpToday;
        } catch { /* grade stands */ }
      }
    } catch { /* preview mode */ }
  }

  return NextResponse.json({
    passage: { slug: passage.slug, title: passage.title, level: passage.level },
    wordCount: base.wordCount, passageWords: base.passageWords, matchedWords: base.matchedWords,
    accuracy: base.accuracy, wpm: base.wpm, missedWords: base.missedWords,
    extraCount: base.extraCount, score, feedback, hardWords,
    xpEarned, saved, streak, xpToday, ai,
  });
}
