import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isGeminiConfigured } from "@/lib/env";
import { getDashboardData } from "@/lib/dashboard/queries";
import { generateText } from "@/lib/gemini/client";

/**
 * Optional AI enhancement for recommendations.
 * Default dashboard uses deterministic rules (zero tokens); this endpoint is
 * called only when the user taps "Personalize with AI". Compact prompt, small
 * user context, short completion. Falls back to deterministic list on any error.
 */
export async function POST() {
  let data = null;
  try {
    data = await getDashboardData();
  } catch {
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 });
  }

  const fallback = data.recommendations;
  if (!isGeminiConfigured()) {
    return NextResponse.json({ recommendations: fallback, ai: false, reason: "GEMINI_API_KEY is not set." });
  }

  const profile = data.profile;
  const prompt = [
    `Learner: level ${profile?.level ?? "unknown"}, mode ${profile?.learning_mode ?? "unknown"}, goals: ${(profile?.goals ?? []).join(", ") || "general English"}.`,
    `Today: ${data.xpToday}/${data.dailyGoalXp} XP, streak ${data.streak.current}d, challenge ${data.challengeDone ? "done" : "todo"}, words saved: unknown.`,
    `Current suggestions: ${fallback.map((r) => r.title).join(" | ")}.`,
    `Reply with at most 4 lines, each exactly: "Title — one-sentence why (module: /path)". Keep under 60 words total.`,
  ].join("\n");

  try {
    const text = await generateText(prompt, {
      systemPrompt: "You are LinguaAI, a concise English coach. Only recommend app modules: /vocabulary /grammar /reading /listening /speaking /writing /daily-challenge /flashcards.",
      maxOutputTokens: 160,
      temperature: 0.5,
    });
    const lines = text.split("\n").map((l) => l.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean).slice(0, 4);
    if (lines.length === 0) return NextResponse.json({ recommendations: fallback, ai: false });
    const hrefOf = (line: string): string => {
      const m = line.match(/\/[a-z-]+/);
      return m ? m[0] : "/dashboard";
    };
    return NextResponse.json({
      ai: true,
      recommendations: lines.map((line, i) => ({
        id: `ai-${i}`,
        title: line.split("—")[0]?.trim() || line,
        description: line.split("—")[1]?.trim() || "AI-picked for you today.",
        href: hrefOf(line),
        reason: "Personalized with AI",
        xp: fallback[i]?.xp ?? 15,
      })),
    });
  } catch {
    return NextResponse.json({ recommendations: fallback, ai: false, reason: "AI unavailable — showing rule-based picks." });
  }
}
