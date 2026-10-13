/** Flashcards Pro — server auth + set-ownership helpers (server-only). */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function requireUser() {
  if (!isSupabaseConfigured()) {
    return { error: NextResponse.json({ error: "Database is not configured." }, { status: 503 }) as NextResponse, supabase: null, userId: null as string | null };
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return { error: NextResponse.json({ error: "Database is not configured." }, { status: 503 }) as NextResponse, supabase: null, userId: null as string | null };
  }
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id ?? null;
  if (!userId) {
    return { error: NextResponse.json({ error: "Sign in to manage vocabulary sets." }, { status: 401 }) as NextResponse, supabase: null, userId: null as string | null };
  }
  return { error: null as NextResponse | null, supabase, userId };
}

export async function getOwnedSet(
  supabase: any,
  userId: string,
  setId: string
) {
  const { data, error } = await supabase.from("vocab_sets").select("*").eq("id", setId).eq("user_id", userId).maybeSingle();
  if (error) return { set: null, error };
  return { set: data as Record<string, unknown> | null, error: null };
}

export function todayKeyUTC(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
