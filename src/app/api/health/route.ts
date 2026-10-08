import { NextResponse } from "next/server";
import { isSupabaseConfigured, isSupabaseUrlValid, isGeminiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return NextResponse.json({
    ok: true,
    phase: 13,
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    services: {
      supabase: isSupabaseConfigured() ? "configured" : "missing",
      gemini: isGeminiConfigured() ? "configured" : "missing",
    },
    // Booleans only — never expose values.
    supabaseEnv: {
      urlPresent: url.trim().length > 0,
      urlValid: isSupabaseUrlValid(url),
      anonPresent: anon.trim().length > 0,
      appUrlPresent: (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().length > 0,
    },
  });
}
