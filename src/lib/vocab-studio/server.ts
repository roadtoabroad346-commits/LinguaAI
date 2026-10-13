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

/**
 * True when a Supabase error means the Flashcards Pro tables have not been
 * created yet (migrations 0019/0020 not applied): PostgREST schema-cache
 * miss (PGRST205) or Postgres undefined-table (42P01). Callers map this to
 * an honest 503 { code: "needs_migration" } instead of a cryptic 500.
 */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = String((err as { code?: unknown }).code ?? "");
  const message = String((err as { message?: unknown }).message ?? "");
  if (code === "PGRST205" || code === "42P01") return true;
  return /could not find the table|not find .* in the schema cache|relation .* does not exist/i.test(message);
}

export function needsMigrationResponse() {
  return NextResponse.json(
    {
      error: "Vocabulary Sets storage is not ready yet — the database update has not been applied.",
      code: "needs_migration",
    },
    { status: 503 }
  );
}
