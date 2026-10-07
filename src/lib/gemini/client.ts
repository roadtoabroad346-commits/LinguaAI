/** Server-only Gemini layer. Never import from client components. */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
export type GeminiGenerateOptions = { systemPrompt?: string; maxOutputTokens?: number; temperature?: number };
export async function generateText(prompt: string, opts: GeminiGenerateOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. See .env.example.");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: opts.systemPrompt });
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: opts.maxOutputTokens ?? 512, temperature: opts.temperature ?? 0.7 }
  });
  return result.response.text();
}
/** Deterministic fallback when AI is unnecessary or quota must be saved. */
export function deterministicFallback(kind: string): string {
  return `[deterministic:${kind}] AI unavailable — using rule-based result.`;
}
