import { NextResponse } from "next/server";
import { isSupabaseConfigured, isGeminiConfigured } from "@/lib/env";
export async function GET() {
  return NextResponse.json({
    ok: true, phase: 10, timestamp: new Date().toISOString(),
    services: { supabase: isSupabaseConfigured() ? "configured" : "missing", gemini: isGeminiConfigured() ? "configured" : "missing" }
  });
}
