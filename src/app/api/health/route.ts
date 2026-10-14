import { NextResponse } from "next/server";
import { isSupabaseConfigured, isSupabaseUrlValid, isGeminiConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  let supabase: "healthy" | "unreachable" | "missing" = "missing";
  if (isSupabaseConfigured() && isSupabaseUrlValid(url)) {
    try {
      const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/health`, {
        headers: { apikey: anon }, cache: "no-store", signal: AbortSignal.timeout(3000),
      });
      supabase = response.ok ? "healthy" : "unreachable";
    } catch {
      supabase = "unreachable";
    }
  }
  const gemini = isGeminiConfigured() ? "configured" : "missing";
  const ok = supabase === "healthy" && gemini === "configured";
  return NextResponse.json({
    ok,
    timestamp: new Date().toISOString(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? null,
    services: { supabase, gemini },
  }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
