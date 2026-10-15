import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/security";
import { resolveTtsSource } from "@/lib/audio/tts-sources";
import { getOrCreateTts, ttsCacheKey } from "@/lib/gemini/tts";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = resolveTtsSource(new URL(request.url).searchParams);
  if (!source) return NextResponse.json({ error: "Audio source not found." }, { status: 404 });
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "Reference audio is temporarily unavailable.", fallback: true }, { status: 503 });
  }
  const limited = await checkRateLimit(request, { key: "gemini-tts", limit: 40 });
  if (limited) return limited;

  const cacheKey = ttsCacheKey({ text: source.text, style: source.style });
  const etag = `"${cacheKey}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" } });
  }

  try {
    const audio = await getOrCreateTts({ text: source.text, style: source.style });
    const body = audio.bytes.buffer.slice(audio.bytes.byteOffset, audio.bytes.byteOffset + audio.bytes.byteLength) as ArrayBuffer;
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": audio.mimeType,
        "Content-Length": String(audio.bytes.byteLength),
        "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable",
        ETag: etag,
        "X-Audio-Cache": audio.cacheStatus,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    // Never synthesize a fake assessment or silent audio file. Clients can use
    // the browser voice as an explicit availability fallback.
    return NextResponse.json({ error: "Reference audio could not be generated.", fallback: true }, { status: 503 });
  }
}
