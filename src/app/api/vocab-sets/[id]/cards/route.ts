import { NextResponse } from "next/server";
import { cardSchema, updateCardSchema } from "@/lib/vocab-studio/schemas";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

function toRow(p: Record<string, unknown>, setId: string, userId: string): Record<string, unknown> {
  return {
    set_id: setId,
    user_id: userId,
    front: String(p.front ?? "").trim(),
    back: String(p.back ?? "").trim(),
    word: String(p.word ?? p.front ?? "").trim().slice(0, 200),
    definition: String(p.definition ?? "").trim(),
    example: String(p.example ?? "").trim(),
    example_translation: String(p.exampleTranslation ?? "").trim(),
    part_of_speech: (p.partOfSpeech as string | null) ?? null,
    level: (p.level as string | null) ?? null,
    phonetic: String(p.phonetic ?? "").trim(),
    synonyms: (p.synonyms as string[]) ?? [],
    antonyms: (p.antonyms as string[]) ?? [],
    collocations: (p.collocations as string[]) ?? [],
    grammar_notes: String(p.grammarNotes ?? "").trim(),
    personal_notes: String(p.personalNotes ?? "").trim(),
    tags: (p.tags as string[]) ?? [],
    source: String(p.source ?? "custom").trim() || "custom",
  };
}

/** GET /api/vocab-sets/[id]/cards — list cards (search supported). */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  const { data, error: cErr } = await supabase.from("vocab_cards").select("*").eq("set_id", params.id).eq("user_id", userId).order("created_at", { ascending: true }).limit(2000);
  if (cErr) return NextResponse.json({ error: "Could not load cards." }, { status: 500 });
  let cards = (data ?? []) as Array<Record<string, unknown>>;
  if (q) cards = cards.filter((c) => [c.front, c.back, c.word, c.definition].some((v) => String(v ?? "").toLowerCase().includes(q)));
  return NextResponse.json({ cards });
}

/** POST /api/vocab-sets/[id]/cards — add one card (duplicate-guarded). */
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = cardSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid card.", issues: parsed.error.flatten() }, { status: 400 });

  const { count } = await supabase.from("vocab_cards").select("id", { count: "exact", head: true }).eq("set_id", params.id).eq("user_id", userId);
  if ((count ?? 0) >= 2000) return NextResponse.json({ error: "Card limit reached (2000 per set)." }, { status: 400 });

  const word = parsed.data.word.trim();
  const { data: dup } = await supabase.from("vocab_cards").select("id").eq("set_id", params.id).eq("user_id", userId).ilike("word", word).limit(1);
  if (dup && (dup as unknown[]).length > 0) {
    return NextResponse.json({ error: `Duplicate: "${word}" is already in this set.`, duplicate: true }, { status: 409 });
  }

  const { data, error: iErr } = await supabase.from("vocab_cards").insert({
    ...toRow(parsed.data as unknown as Record<string, unknown>, params.id, userId),
    status: "new", mastery: 0, ease_factor: 2.5, interval_days: 0,
    review_count: 0, correct_count: 0, lapses: 0,
  } as never).select("*").maybeSingle() as any;
  if (iErr) return NextResponse.json({ error: "Could not save the card." }, { status: 500 });
  await supabase.from("vocab_sets").update({} as never).eq("id", params.id).eq("user_id", userId);
  return NextResponse.json({ card: data }, { status: 201 });
}
