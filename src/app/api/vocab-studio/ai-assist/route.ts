import { NextResponse } from "next/server";
import { aiAssistSchema } from "@/lib/vocab-studio/schemas";
import { requireUser } from "@/lib/vocab-studio/server";
import { checkRateLimit } from "@/lib/api/security";
import { isGeminiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * POST /api/vocab-studio/ai-assist — definition/example/synonyms/CEFR suggestion.
 * Reuses the existing Gemini layer. Graceful disabled state when no key.
 * NEVER overwrites user content: returns suggestions for explicit review.
 */
export async function POST(request: Request) {
  const { error, userId } = await requireUser();
  if (error || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = aiAssistSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request.", issues: parsed.error.flatten() }, { status: 400 });

  // AI costs tokens: per-user limit even when configured.
  const limited = checkRateLimit(request, { key: "vocab-ai-assist", limit: 20, scope: userId });
  if (limited) return limited;

  if (!isGeminiConfigured()) {
    return NextResponse.json({
      configured: false,
      error: "AI is not configured. Set GEMINI_API_KEY to enable suggestions.",
      hint: "See .env.example — GEMINI_API_KEY + GEMINI_MODEL.",
    }, { status: 503 });
  }

  const { word, targetLanguage, nativeLanguage, level, context } = parsed.data;
  const { generateText } = await import("@/lib/gemini/client");
  const prompt = [
    `You are an English vocabulary coach. Respond with STRICT JSON only (no markdown):`,
    `{"definition":"...","example":"...","exampleTranslation":"...","synonyms":["..."],"antonyms":["..."],"collocations":["..."],"cefr":"A1|A2|B1|B2|C1","usageNote":"..."}`,
    `Word/phrase: "${word}"`,
    `Target language: ${targetLanguage}${nativeLanguage ? `; learner's native language: ${nativeLanguage}` : ""}${level ? `; suggested level: ${level}` : ""}${context ? `; context: ${context}` : ""}`,
    `Rules: plain learner-friendly definition (<=25 words); one natural example sentence; no fabricated dictionary citations or IPA unless confident (omit rather than invent); cefr is an estimate — keep "usageNote" honest about uncertainty.`,
  ].join("\n");

  try {
    const raw = await generateText(prompt, { maxOutputTokens: 500, temperature: 0.5 });
    const jsonText = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    const suggestion = JSON.parse(jsonText) as Record<string, unknown>;
    const cefr = typeof suggestion.cefr === "string" && ["A1", "A2", "B1", "B2", "C1"].includes(suggestion.cefr) ? suggestion.cefr : null;
    return NextResponse.json({
      configured: true,
      suggestion: {
        definition: String(suggestion.definition ?? "").slice(0, 2000),
        example: String(suggestion.example ?? "").slice(0, 2000),
        exampleTranslation: String(suggestion.exampleTranslation ?? "").slice(0, 2000),
        synonyms: Array.isArray(suggestion.synonyms) ? (suggestion.synonyms as unknown[]).map(String).slice(0, 10) : [],
        antonyms: Array.isArray(suggestion.antonyms) ? (suggestion.antonyms as unknown[]).map(String).slice(0, 10) : [],
        collocations: Array.isArray(suggestion.collocations) ? (suggestion.collocations as unknown[]).map(String).slice(0, 10) : [],
        cefrEstimate: cefr,
        usageNote: String(suggestion.usageNote ?? "").slice(0, 2000),
        disclaimer: "AI suggestion — review before saving. CEFR is an estimate, not a certified rating.",
      },
    });
  } catch {
    return NextResponse.json({ error: "AI request failed. Try again." }, { status: 502 });
  }
}

/** GET — capability probe for the UI disabled state. */
export async function GET() {
  return NextResponse.json({ configured: isGeminiConfigured() });
}
