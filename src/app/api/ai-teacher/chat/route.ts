import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/api/security";
import { teacherChatSchema } from "@/lib/writing/schemas";
import { buildTeacherSystemPrompt, buildHistorySlice, fallbackTeacherReply } from "@/lib/teacher/teacher";
import { generateText } from "@/lib/gemini/client";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { key: "ai-teacher-chat", limit: 15, windowMs: 60_000 });
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = teacherChatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid messages.", issues: parsed.error.flatten() }, { status: 400 });

  const messages = parsed.data.messages.slice(-10);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return NextResponse.json({ error: "No user message." }, { status: 400 });
  if (lastUser.content.length > 2000) return NextResponse.json({ error: "Message too long." }, { status: 400 });

  // Compact user context: level + goals + interface language (token-efficient).
  let level: string | null = null;
  let goals: string[] = [];
  let interfaceLanguage: "kk" | "ru" | "en" = "kk";
  const bodyLang = (body as { interfaceLanguage?: unknown }).interfaceLanguage;
  if (bodyLang === "kk" || bodyLang === "ru" || bodyLang === "en") interfaceLanguage = bodyLang;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase.from("profiles").select("level,goals,preferred_language").eq("id", data.user.id).maybeSingle();
        const p = profile as { level?: string | null; goals?: string[]; preferred_language?: string } | null;
        if (p?.level) level = p.level;
        if (Array.isArray(p?.goals)) goals = p.goals.slice(0, 3);
        // Profile setting wins over the client hint (user setting → local → browser).
        if (p?.preferred_language === "kk" || p?.preferred_language === "ru" || p?.preferred_language === "en") {
          interfaceLanguage = p.preferred_language;
        }
      }
    } catch { /* preview */ }
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json({ reply: fallbackTeacherReply(lastUser.content, interfaceLanguage), ai: false, reason: "GEMINI_API_KEY is not set." });
  }

  const prompt = `Conversation (latest last):\n${buildHistorySlice(messages)}\n\nReply as Teacher (under 120 words, end with one follow-up question or task).`;
  try {
    const reply = await generateText(prompt, { systemPrompt: buildTeacherSystemPrompt({ level, goals, interfaceLanguage }), maxOutputTokens: 280, temperature: 0.7 });

    // Persist history best-effort (last exchange only).
    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          await supabase.from("ai_messages").insert([
            { user_id: data.user.id, role: "user", content: lastUser.content.slice(0, 2000) },
            { user_id: data.user.id, role: "assistant", content: reply.slice(0, 2000) },
          ] as never);
          // Retention hygiene: chat history older than 90 days is pruned
          // best-effort so per-user tables stay small and fast.
          const cutoff = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
          await supabase.from("ai_messages").delete().eq("user_id", data.user.id).lt("created_at", cutoff);
        }
      } catch { /* non-blocking */ }
    }
    return NextResponse.json({ reply, ai: true });
  } catch {
    return NextResponse.json({ reply: fallbackTeacherReply(lastUser.content, interfaceLanguage), ai: false, reason: "AI unavailable — offline answer." });
  }
}
