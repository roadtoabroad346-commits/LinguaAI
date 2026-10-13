import { NextResponse } from "next/server";
import { toCsv } from "@/lib/vocab-studio/csv";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

/** GET /api/vocab-sets/[id]/export?format=csv|json — private by default (owner-only). */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const format = new URL(request.url).searchParams.get("format") ?? "json";
  const { data, error: cErr } = await supabase.from("vocab_cards").select("*").eq("set_id", params.id).eq("user_id", userId).order("created_at", { ascending: true }).limit(2000);
  if (cErr) return NextResponse.json({ error: "Could not export." }, { status: 500 });
  const cards = (data ?? []) as Array<Record<string, unknown>>;
  const title = String(set.title ?? "set").replace(/[^\w\-]+/g, "-").slice(0, 60) || "set";

  if (format === "csv") {
    const csv = toCsv(cards.map((c) => ({
      front: c.front, back: c.back, word: c.word, definition: c.definition,
      example: c.example, example_translation: c.example_translation,
      part_of_speech: c.part_of_speech, level: c.level, phonetic: c.phonetic,
      synonyms: c.synonyms, antonyms: c.antonyms, collocations: c.collocations,
      grammar_notes: c.grammar_notes, personal_notes: c.personal_notes,
      tags: c.tags, source: c.source,
    })));
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${title}.csv"`,
      },
    });
  }
  return NextResponse.json({
    set: { id: set.id, title: set.title, description: set.description, level: set.level, category: set.category },
    count: cards.length,
    rows: cards.map((c) => ({
      front: c.front, back: c.back, word: c.word, definition: c.definition,
      example: c.example, exampleTranslation: c.example_translation,
      partOfSpeech: c.part_of_speech, level: c.level, phonetic: c.phonetic,
      synonyms: c.synonyms, antonyms: c.antonyms, collocations: c.collocations,
      grammarNotes: c.grammar_notes, personalNotes: c.personal_notes,
      tags: c.tags, source: c.source,
    })),
  });
}
