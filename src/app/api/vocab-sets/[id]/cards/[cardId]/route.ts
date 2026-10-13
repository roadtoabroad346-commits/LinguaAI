import { NextResponse } from "next/server";
import { updateCardSchema } from "@/lib/vocab-studio/schemas";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

function toPatch(p: Record<string, unknown>): Record<string, unknown> {
  const m: Record<string, string> = {
    front: "front", back: "back", word: "word", definition: "definition",
    example: "example", exampleTranslation: "example_translation",
    partOfSpeech: "part_of_speech", level: "level", phonetic: "phonetic",
    synonyms: "synonyms", antonyms: "antonyms", collocations: "collocations",
    grammarNotes: "grammar_notes", personalNotes: "personal_notes",
    tags: "tags", source: "source",
  };
  const out: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(m)) {
    if (p[k] !== undefined) out[col] = typeof p[k] === "string" ? String(p[k]).trim() : p[k];
  }
  return out;
}

/** PATCH /api/vocab-sets/[id]/cards/[cardId] — edit (never overwrites without explicit save). */
export async function PATCH(request: Request, { params }: { params: { id: string; cardId: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = updateCardSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid card update.", issues: parsed.error.flatten() }, { status: 400 });
  const patch = toPatch(parsed.data as unknown as Record<string, unknown>);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  const { data, error: uErr } = await supabase.from("vocab_cards").update(patch as never).eq("id", params.cardId).eq("set_id", params.id).eq("user_id", userId).select("*").maybeSingle() as any;
  if (uErr) return NextResponse.json({ error: "Could not update the card." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ card: data });
}

/** DELETE /api/vocab-sets/[id]/cards/[cardId] */
export async function DELETE(_: Request, { params }: { params: { id: string; cardId: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const { error: dErr, count } = await supabase.from("vocab_cards").delete({ count: "exact" }).eq("id", params.cardId).eq("set_id", params.id).eq("user_id", userId);
  if (dErr) return NextResponse.json({ error: "Could not delete the card." }, { status: 500 });
  if ((count ?? 0) === 0) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  return NextResponse.json({ deleted: true, id: params.cardId });
}

/** POST handled as duplicate-card: POST /api/vocab-sets/[id]/cards/[cardId]/duplicate */
export async function POST(_: Request, { params }: { params: { id: string; cardId: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const { data: src } = await supabase.from("vocab_cards").select("*").eq("id", params.cardId).eq("set_id", params.id).eq("user_id", userId).maybeSingle();
  if (!src) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  const s = src as Record<string, unknown>;
  const { data, error: iErr } = await supabase.from("vocab_cards").insert({
    set_id: params.id, user_id: userId,
    front: s.front, back: s.back, word: `${String(s.word)} (copy)`.slice(0, 200),
    definition: s.definition ?? "", example: s.example ?? "",
    example_translation: s.example_translation ?? "",
    part_of_speech: s.part_of_speech ?? null, level: s.level ?? null,
    phonetic: s.phonetic ?? "", synonyms: s.synonyms ?? [],
    antonyms: s.antonyms ?? [], collocations: s.collocations ?? [],
    grammar_notes: s.grammar_notes ?? "", personal_notes: s.personal_notes ?? "",
    tags: s.tags ?? [], source: s.source ?? "custom",
    status: "new", mastery: 0, ease_factor: 2.5, interval_days: 0,
    review_count: 0, correct_count: 0, lapses: 0,
  } as never).select("*").maybeSingle() as any;
  if (iErr) return NextResponse.json({ error: "Could not duplicate the card." }, { status: 500 });
  return NextResponse.json({ card: data }, { status: 201 });
}
