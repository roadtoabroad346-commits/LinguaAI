/** Server-only Gemini layer. Never import from client components. */
const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
/** Upper bound for one AI call so slow providers fail fast into deterministic fallbacks. */
export const GEMINI_TIMEOUT_MS = 25_000;
export type GeminiGenerateOptions = { systemPrompt?: string; maxOutputTokens?: number; temperature?: number; timeoutMs?: number };
export async function generateText(prompt: string, opts: GeminiGenerateOptions = {}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. See .env.example.");
  const timeoutMs = opts.timeoutMs ?? GEMINI_TIMEOUT_MS;
  const work = (async () => {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: opts.systemPrompt });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: opts.maxOutputTokens ?? 512, temperature: opts.temperature ?? 0.7 }
    });
    return result.response.text();
  })();
  // Settle the loser silently so a timeout never surfaces as an unhandled rejection.
  work.catch(() => {});
  const timeout = new Promise<never>((_, reject) => {
    const t = setTimeout(() => reject(new Error(`AI request timed out after ${timeoutMs}ms.`)), timeoutMs);
    work.then(
      () => clearTimeout(t),
      () => clearTimeout(t)
    );
  });
  return Promise.race([work, timeout]);
}
/** Deterministic fallback when AI is unnecessary or quota must be saved. */
export function deterministicFallback(kind: string): string {
  return `[deterministic:${kind}] AI unavailable — using rule-based result.`;
}
