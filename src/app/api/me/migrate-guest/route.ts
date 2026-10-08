import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const migrateSchema = z.object({
  words: z.array(z.string().trim().min(1).max(80)).max(500).optional().default([]),
});

/**
 * POST /api/me/migrate-guest — one-time guest -> account merge.
 * Server wins on conflict; never overwrites a completed placement.
 */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = migrateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const words = Array.from(new Set(parsed.data.words.map((w) => w.toLowerCase()))).slice(0, 500);
  if (words.length === 0) return NextResponse.json({ ok: true, imported: 0 });

  const { data: existing } = await supabase
    .from("dictionary_entries")
    .select("word")
    .eq("user_id", user.id)
    .in("word", words);
  const have = new Set(((existing ?? []) as Array<{ word: string }>).map((r) => r.word.toLowerCase()));
  const fresh = words.filter((w) => !have.has(w)).slice(0, 200);
  if (fresh.length === 0) return NextResponse.json({ ok: true, imported: 0 });

  const { error } = await supabase.from("dictionary_entries").insert(
    fresh.map((word) => ({ user_id: user.id, word, source: "guest-migration" }) as never)
  );
  if (error) return NextResponse.json({ error: "Could not migrate words." }, { status: 500 });
  return NextResponse.json({ ok: true, imported: fresh.length });
}
