import { describe, expect, it, vi } from "vitest";
import { generateGeminiSpeech, getOrCreateTts, parseGeminiTtsResponse, ttsCacheKey, type TtsCache } from "@/lib/gemini/tts";
import { resolveTtsSource } from "@/lib/audio/tts-sources";

const wav = new Uint8Array(64).fill(1);

describe("Gemini TTS", () => {
  it("creates stable keys and changes them for voice or text", () => {
    expect(ttsCacheKey({ text: " Hello   world " })).toBe(ttsCacheKey({ text: "Hello world" }));
    expect(ttsCacheKey({ text: "Hello world" })).not.toBe(ttsCacheKey({ text: "Hello world", voice: "Puck" }));
  });

  it("extracts the last audio block and rejects missing audio", () => {
    const parsed = parseGeminiTtsResponse({ steps: [{ content: [{ type: "audio", data: Buffer.from(wav).toString("base64") }] }] });
    expect(parsed.bytes).toHaveLength(64);
    expect(() => parseGeminiTtsResponse({ steps: [] })).toThrow(/no audio/i);
  });

  it("uses persistent cache and avoids duplicate generation", async () => {
    const values = new Map<string, { bytes: Uint8Array; mimeType: "audio/wav" }>();
    const cache: TtsCache = { get: async (key) => values.get(key) ?? null, put: async (key, audio) => { values.set(key, audio); } };
    const generate = vi.fn(async () => ({ bytes: wav, mimeType: "audio/wav" as const }));
    const first = await getOrCreateTts({ text: "Unique cache test sentence 9137" }, { cache, generate });
    const second = await getOrCreateTts({ text: "Unique cache test sentence 9137" }, { cache, generate });
    expect(first.cacheStatus).toBe("miss");
    expect(second.cacheStatus).toBe("hit");
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("only resolves allow-listed catalogue audio", () => {
    expect(resolveTtsSource(new URLSearchParams("kind=listening&slug=at-the-cafe&segment=line&index=0"))?.text).toContain("Good morning");
    expect(resolveTtsSource(new URLSearchParams("kind=exercise&slug=station-announcement-detail"))?.text).toContain("platform fourteen");
    expect(resolveTtsSource(new URLSearchParams("kind=exercise&slug=unknown"))).toBeNull();
  });

  it("fails honestly when the server key is unavailable", async () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      await expect(generateGeminiSpeech({ text: "Do not fabricate audio" })).rejects.toThrow(/not configured/i);
    } finally {
      if (previous === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = previous;
    }
  });
});
