import { NextResponse } from "next/server";
import { isGeminiConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/api/security";
import { getWord } from "@/lib/vocab/bank";
import { translateSchema } from "@/lib/vocab/schemas";

/**
 * Lazy translation for a bank word. Called only when the learner taps
 * "Translate" on a word detail — keeps Gemini usage minimal.
 */
export async function POST(request: Request) {
  const limited = checkRateLimit(request, { key: "vocab-translate", limit: 20, windowMs: 60_000 });
  if (limited) return limited;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = translateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request.", issues: parsed.error.flatten() }, { status: 400 });

  const entry = getWord(parsed.data.word);
  if (!entry) return NextResponse.json({ error: "Unknown word." }, { status: 404 });
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "Translations need GEMINI_API_KEY (server-only). Definition is shown instead.", fallback: true }, { status: 503 });
  }

  try {
    const { generateText } = await import("@/lib/gemini/client");
    const raw = await generateText(
      `Translate the English word "${entry.word}" (${entry.partOfSpeech}, ${entry.level}) into ${parsed.data.targetLang}. Reply with ONLY the translation, max 5 words, no explanation.`,
      { maxOutputTokens: 32, temperature: 0.2 }
    );
    const translation = raw.trim().split("\n")[0].slice(0, 200);
    return NextResponse.json({ word: entry.slug, targetLang: parsed.data.targetLang, translation });
  } catch {
    return NextResponse.json({ error: "Translation failed. Try again later.", fallback: true }, { status: 502 });
  }
}
