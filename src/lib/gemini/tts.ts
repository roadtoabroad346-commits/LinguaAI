import { createHash } from "node:crypto";
import { readJson } from "@/lib/api/response";
import { createServiceClient } from "@/lib/supabase/service";

export const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-lite-tts";
export const TTS_CACHE_BUCKET = "linguaai-tts-cache";
const MAX_TEXT_LENGTH = 4_000;
const memoryCache = new Map<string, TtsAudio>();
const inFlight = new Map<string, Promise<CachedTtsResult>>();

export interface TtsAudio { bytes: Uint8Array; mimeType: "audio/wav"; }
export interface CachedTtsResult extends TtsAudio { cacheKey: string; cacheStatus: "hit" | "miss"; }
export interface TtsRequest { text: string; voice?: string; style?: string; model?: string; }
export interface TtsCache {
  get(key: string): Promise<TtsAudio | null>;
  put(key: string, audio: TtsAudio): Promise<void>;
}

function normalizedRequest(request: TtsRequest) {
  const text = request.text.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!text || text.length > MAX_TEXT_LENGTH) throw new Error("TTS text is empty or too long.");
  return {
    text,
    voice: (request.voice ?? "Kore").trim().slice(0, 80),
    style: (request.style ?? "Clear, friendly English teaching voice at a natural pace.").trim().slice(0, 240),
    model: (request.model ?? GEMINI_TTS_MODEL).trim(),
  };
}

export function ttsCacheKey(request: TtsRequest): string {
  const normalized = normalizedRequest(request);
  return createHash("sha256").update(JSON.stringify({ v: 1, ...normalized })).digest("hex");
}

export function parseGeminiTtsResponse(payload: unknown): TtsAudio {
  if (!payload || typeof payload !== "object") throw new Error("Gemini returned an invalid TTS response.");
  const steps = (payload as { steps?: unknown }).steps;
  if (!Array.isArray(steps)) throw new Error("Gemini returned no audio steps.");
  const blocks = steps.flatMap((step) => {
    if (!step || typeof step !== "object") return [];
    const content = (step as { content?: unknown }).content;
    return Array.isArray(content) ? content : [];
  });
  const audio = [...blocks].reverse().find((block) => block && typeof block === "object" && (block as { type?: unknown }).type === "audio") as { data?: unknown } | undefined;
  if (!audio || typeof audio.data !== "string" || !audio.data) throw new Error("Gemini returned no audio data.");
  const bytes = Buffer.from(audio.data, "base64");
  if (bytes.length < 44 || bytes.length > 10 * 1024 * 1024) throw new Error("Gemini returned invalid audio data.");
  return { bytes: new Uint8Array(bytes), mimeType: "audio/wav" };
}

export async function generateGeminiSpeech(request: TtsRequest): Promise<TtsAudio> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
  const normalized = normalizedRequest(request);
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: normalized.model,
      input: [{
        type: "user_input",
        content: [{
          type: "text",
          text: normalized.text,
          annotations: [{ type: "speech_metadata", style: normalized.style }],
        }],
      }],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice: normalized.voice }] },
    }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Gemini TTS failed with HTTP ${response.status}.`);
  return parseGeminiTtsResponse(await readJson(response));
}

function durableCache(): TtsCache | null {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const storage = createServiceClient().storage.from(TTS_CACHE_BUCKET);
  return {
    async get(key) {
      const { data, error } = await storage.download(`${key}.wav`);
      if (error || !data) return null;
      return { bytes: new Uint8Array(await data.arrayBuffer()), mimeType: "audio/wav" };
    },
    async put(key, audio) {
      const { error } = await storage.upload(`${key}.wav`, Buffer.from(audio.bytes), {
        contentType: audio.mimeType,
        cacheControl: "31536000",
        upsert: false,
      });
      // A duplicate-object error means another request won the same cache key.
      if (error && !/duplicate|already exists|409/i.test(error.message)) throw error;
    },
  };
}

export async function getOrCreateTts(
  request: TtsRequest,
  options: { cache?: TtsCache | null; generate?: (request: TtsRequest) => Promise<TtsAudio> } = {},
): Promise<CachedTtsResult> {
  const cacheKey = ttsCacheKey(request);
  const fromMemory = memoryCache.get(cacheKey);
  if (fromMemory) return { ...fromMemory, cacheKey, cacheStatus: "hit" };
  const pending = inFlight.get(cacheKey);
  if (pending) return pending;

  const work = (async () => {
    const cache = options.cache === undefined ? durableCache() : options.cache;
    const stored = await cache?.get(cacheKey).catch(() => null);
    if (stored) {
      memoryCache.set(cacheKey, stored);
      return { ...stored, cacheKey, cacheStatus: "hit" as const };
    }
    const generated = await (options.generate ?? generateGeminiSpeech)(request);
    if (memoryCache.size >= 40) memoryCache.delete(memoryCache.keys().next().value ?? "");
    memoryCache.set(cacheKey, generated);
    await cache?.put(cacheKey, generated).catch(() => undefined);
    return { ...generated, cacheKey, cacheStatus: "miss" as const };
  })();
  inFlight.set(cacheKey, work);
  try {
    return await work;
  } finally {
    inFlight.delete(cacheKey);
  }
}
