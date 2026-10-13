import { NextResponse } from "next/server";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";
import { checkRateLimit } from "@/lib/api/security";

export const dynamic = "force-dynamic";

/** POST /api/vocab-sets/[id]/duplicate — deep-copy set + cards. */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const limited = checkRateLimit(request, { key: "vocab-duplicate", limit: 20, scope: userId });
  if (limited) return limited;
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });

  const { data: cards } = await supabase.from("vocab_cards").select("*").eq("set_id", params.id).eq("user_id", userId).limit(2000);
  const rows = ((cards ?? []) as Array<Record<string, unknown>>);
  if (rows.length > 500) return NextResponse.json({ error: "Set is too large to duplicate (max 500 cards)." }, { status: 400 });

  const { data: copy, error: cErr } = await supabase.from("vocab_sets").insert({
    user_id: userId,
    title: `${String(set.title)} (copy)`.slice(0, 120),
    description: (set.description as string) ?? "",
    language: (set.language as string) ?? "en",
    native_language: (set.native_language as string) ?? "",
    level: (set.level as string | null) ?? null,
    category: (set.category as string) ?? "general",
    color: (set.color as string) ?? "brand",
    icon: (set.icon as string) ?? "layers",
  } as never).select("*").maybeSingle() as any;
  if (cErr || !copy) return NextResponse.json({ error: "Could not duplicate the set." }, { status: 500 });
  const newId = (copy as Record<string, unknown>).id as string;

  if (rows.length > 0) {
    const payload = rows.map((c) => ({
      set_id: newId,
      user_id: userId,
      front: c.front, back: c.back, word: c.word,
      definition: c.definition ?? "", example: c.example ?? "",
      example_translation: c.example_translation ?? "",
      part_of_speech: c.part_of_speech ?? null,
      level: c.level ?? null,
      phonetic: c.phonetic ?? "",
      synonyms: c.synonyms ?? [], antonyms: c.antonyms ?? [], collocations: c.collocations ?? [],
      grammar_notes: c.grammar_notes ?? "", personal_notes: c.personal_notes ?? "",
      tags: c.tags ?? [], source: c.source ?? "custom",
      status: "new", mastery: 0, ease_factor: 2.5, interval_days: 0,
      review_count: 0, correct_count: 0, lapses: 0,
      last_reviewed_at: null, next_review_at: null,
    }));
    const { error: iErr } = await supabase.from("vocab_cards").insert(payload as never);
    if (iErr) {
      await supabase.from("vocab_sets").delete().eq("id", newId).eq("user_id", userId);
      return NextResponse.json({ error: "Could not duplicate cards." }, { status: 500 });
    }
  }
  return NextResponse.json({ set: copy, copiedCards: rows.length }, { status: 201 });
}
