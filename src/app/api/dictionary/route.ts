import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getWord } from "@/lib/vocab/bank";
import { saveWordSchema, removeWordSchema, updateEntrySchema } from "@/lib/vocab/schemas";

export const dynamic = "force-dynamic";

/** Caller user id or null (never throws). */
async function getUserId(): Promise<{ supabase: ReturnType<typeof createClient> | null; userId: string | null }> {
  if (!isSupabaseConfigured()) return { supabase: null, userId: null };
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    return { supabase, userId: data.user?.id ?? null };
  } catch {
    return { supabase: null, userId: null };
  }
}

/** List the caller's saved words, newest first. Signed-out → empty preview payload. */
export async function GET() {
  const { supabase, userId } = await getUserId();
  if (!supabase || !userId) return NextResponse.json({ configured: isSupabaseConfigured(), signedIn: false, entries: [] });
  const { data, error } = await supabase
    .from("dictionary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "Could not load your dictionary." }, { status: 500 });
  return NextResponse.json({ configured: true, signedIn: true, entries: data ?? [] });
}

/** Save a bank word to the personal dictionary (idempotent upsert). */
export async function POST(request: Request) {
  const { supabase, userId } = await getUserId();
  if (!supabase || !userId) return NextResponse.json({ error: "Sign in to save words." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = saveWordSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid word.", issues: parsed.error.flatten() }, { status: 400 });

  const entry = getWord(parsed.data.word);
  if (!entry) return NextResponse.json({ error: "Unknown word. Choose a word from Vocabulary." }, { status: 404 });

  const { data: existing } = await supabase
    .from("dictionary_entries")
    .select("id,mastery")
    .eq("user_id", userId)
    .eq("word", entry.slug)
    .maybeSingle();
  if (existing) return NextResponse.json({ saved: true, repeated: true, entry: existing });

  const { data, error } = await supabase
    .from("dictionary_entries")
    .insert({
      user_id: userId,
      word: entry.slug,
      mastery: 0,
      definition: entry.definition,
      part_of_speech: entry.partOfSpeech,
      level: entry.level,
      phonetic: entry.phonetic,
      example: entry.example,
      source: "vocabulary",
    } as never)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not save the word." }, { status: 500 });
  return NextResponse.json({ saved: true, entry: data }, { status: 201 });
}

/** Remove a word from the personal dictionary. */
export async function DELETE(request: Request) {
  const { supabase, userId } = await getUserId();
  if (!supabase || !userId) return NextResponse.json({ error: "Sign in to edit your dictionary." }, { status: 401 });
  const url = new URL(request.url);
  const parsed = removeWordSchema.safeParse({ word: url.searchParams.get("word") ?? "" });
  if (!parsed.success) return NextResponse.json({ error: "Invalid word." }, { status: 400 });
  const slug = parsed.data.word.trim().toLowerCase();
  const { error } = await supabase.from("dictionary_entries").delete().eq("user_id", userId).eq("word", slug);
  if (error) return NextResponse.json({ error: "Could not remove the word." }, { status: 500 });
  return NextResponse.json({ removed: true, word: slug });
}

/** Update a saved entry (currently: cached translation). */
export async function PATCH(request: Request) {
  const { supabase, userId } = await getUserId();
  if (!supabase || !userId) return NextResponse.json({ error: "Sign in to edit your dictionary." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = updateEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update.", issues: parsed.error.flatten() }, { status: 400 });
  const slug = parsed.data.word.trim().toLowerCase();
  const { data, error } = await supabase
    .from("dictionary_entries")
    .update({ ...(parsed.data.translation !== undefined ? { translation: parsed.data.translation } : {}) } as never)
    .eq("user_id", userId)
    .eq("word", slug)
    .select("*")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Could not update the entry." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Word is not in your dictionary." }, { status: 404 });
  return NextResponse.json({ updated: true, entry: data });
}
