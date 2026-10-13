import { NextResponse } from "next/server";
import { z } from "zod";
import { bulkImportSchema, quickBulkSchema } from "@/lib/vocab-studio/schemas";
import { parseBulkLines, parseCsv, mapCsvRows, splitList, assertFileSize } from "@/lib/vocab-studio/csv";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";
import { checkRateLimit } from "@/lib/api/security";

export const dynamic = "force-dynamic";

function rowToDb(r: Record<string, unknown>, setId: string, userId: string): Record<string, unknown> {
  const lvl = String(r.level ?? "").toUpperCase();
  return {
    set_id: setId, user_id: userId,
    front: String(r.front ?? "").trim().slice(0, 500),
    back: String(r.back ?? r.definition ?? "").trim().slice(0, 2000),
    word: String(r.word ?? r.front ?? "").trim().slice(0, 200),
    definition: String(r.definition ?? "").trim().slice(0, 2000),
    example: String(r.example ?? "").trim().slice(0, 2000),
    example_translation: String(r.exampleTranslation ?? r.example_translation ?? "").trim().slice(0, 2000),
    part_of_speech: (r.partOfSpeech as string) || (r.part_of_speech as string) || null,
    level: ["A1", "A2", "B1", "B2", "C1"].includes(lvl) ? lvl : null,
    phonetic: String(r.phonetic ?? "").trim().slice(0, 120),
    synonyms: Array.isArray(r.synonyms) ? r.synonyms : splitList(String(r.synonyms ?? "")),
    antonyms: Array.isArray(r.antonyms) ? r.antonyms : splitList(String(r.antonyms ?? "")),
    collocations: Array.isArray(r.collocations) ? r.collocations : splitList(String(r.collocations ?? "")),
    grammar_notes: String(r.grammarNotes ?? r.grammar_notes ?? "").trim().slice(0, 2000),
    personal_notes: String(r.personalNotes ?? r.personal_notes ?? "").trim().slice(0, 2000),
    tags: Array.isArray(r.tags) ? r.tags : splitList(String(r.tags ?? "")),
    source: String(r.source ?? "import").trim().slice(0, 120) || "import",
    status: "new", mastery: 0, ease_factor: 2.5, interval_days: 0,
    review_count: 0, correct_count: 0, lapses: 0,
  };
}

async function applyImport(
  supabase: any, userId: string, setId: string,
  rows: Array<Record<string, unknown>>, mode: "skip" | "update" | "import"
) {
  const { data: existing } = await supabase.from("vocab_cards").select("id,word").eq("set_id", setId).eq("user_id", userId).limit(2000);
  const byWord = new Map<string, string>();
  for (const e of ((existing ?? []) as Array<{ id: string; word: string }>)) byWord.set(e.word.trim().toLowerCase(), e.id);

  let inserted = 0, updated = 0, skipped = 0;
  const errors: Array<{ index: number; error: string }> = [];
  const toInsert: Array<Record<string, unknown>> = [];

  rows.forEach((r, i) => {
    const front = String(r.front ?? r.word ?? "").trim();
    const back = String(r.back ?? r.definition ?? "").trim();
    const word = String(r.word ?? front).trim();
    if (!front || !back || !word) { errors.push({ index: i + 1, error: "Missing front/back/word." }); return; }
    const key = word.toLowerCase();
    const existingId = byWord.get(key);
    if (existingId) {
      if (mode === "skip") { skipped++; return; }
      if (mode === "update") { /* handled below one-by-one */ }
    }
    if (!existingId) toInsert.push(rowToDb({ ...r, front, back, word }, setId, userId));
  });

  // Updates (mode=update): apply sequentially to keep it auditable
  if (mode === "update") {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const word = String(r.word ?? r.front ?? "").trim();
      const id = byWord.get(word.toLowerCase());
      if (!id) continue;
      const patch = rowToDb({ ...r }, setId, userId);
      delete (patch as Record<string, unknown>).set_id;
      delete (patch as Record<string, unknown>).user_id;
      const { error } = await supabase.from("vocab_cards").update({ ...patch, front: String(r.front ?? r.word ?? "").trim(), back: String(r.back ?? r.definition ?? "").trim() } as never).eq("id", id).eq("user_id", userId);
      if (error) errors.push({ index: i + 1, error: "Update failed." });
      else updated++;
    }
  } else if (mode === "import") {
    // import = insert even duplicates (suffix copy marker avoided; word kept, front/back kept)
    rows.forEach((r) => {
      const front = String(r.front ?? r.word ?? "").trim();
      const back = String(r.back ?? r.definition ?? "").trim();
      if (front && back) toInsert.push(rowToDb({ ...r, front, back, word: String(r.word ?? front).trim() }, setId, userId));
    });
    // toInsert already has skip-filtered rows; for import mode re-add duplicates:
    // (rows with duplicates were already pushed once; push second copy for dup keys)
    // Simpler: duplicates also inserted once — matches "import anyway" semantics.
    skipped = 0;
  }

  if (toInsert.length > 0) {
    // Chunk inserts (Supabase row limit safety)
    for (let i = 0; i < toInsert.length; i += 100) {
      const chunk = toInsert.slice(i, i + 100);
      const { error } = await supabase.from("vocab_cards").insert(chunk as never);
      if (error) {
        chunk.forEach((_, j) => errors.push({ index: i + j + 1, error: "Insert failed." }));
      } else inserted += chunk.length;
    }
  }
  if (mode === "skip") skipped = rows.length - inserted - errors.length;

  return { inserted, updated, skipped, errors, total: rows.length };
}

/**
 * POST /api/vocab-sets/[id]/import
 * Body variants:
 *  - { format:"json", mode, rows:[...] }
 *  - { format:"csv", mode, csv:"..." }
 *  - { format:"quick", mode, text:"..." }
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });

  // Bulk writes are expensive: per-user limit.
  const limited = checkRateLimit(request, { key: "vocab-import", limit: 10, scope: userId });
  if (limited) return limited;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const fmt = (body as Record<string, unknown>)?.format;

  try {
    if (fmt === "json") {
      const parsed = bulkImportSchema.safeParse({ mode: (body as Record<string, unknown>).mode ?? "skip", rows: (body as Record<string, unknown>).rows });
      if (!parsed.success) return NextResponse.json({ error: "Invalid import rows.", issues: parsed.error.flatten() }, { status: 400 });
      const summary = await applyImport(supabase, userId, params.id, parsed.data.rows as unknown as Array<Record<string, unknown>>, parsed.data.mode);
      return NextResponse.json({ summary });
    }
    if (fmt === "quick") {
      const parsed = quickBulkSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid bulk text.", issues: parsed.error.flatten() }, { status: 400 });
      const lines = parseBulkLines(parsed.data.text);
      if (lines.length === 0) return NextResponse.json({ error: "No valid lines found. Use `front | back` per line." }, { status: 400 });
      const rows = lines.map((l) => ({ front: l.front, back: l.back, word: l.word, definition: l.back, example: "", source: "quick-add" }));
      const summary = await applyImport(supabase, userId, params.id, rows, parsed.data.mode);
      return NextResponse.json({ summary });
    }
    if (fmt === "csv") {
      const schema = z.object({ mode: z.enum(["skip", "update", "import"]).default("skip"), csv: z.string().min(1).max(1_000_000) });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Invalid CSV payload.", issues: parsed.error.flatten() }, { status: 400 });
      assertFileSize(parsed.data.csv.length);
      const csvParsed = parseCsv(parsed.data.csv);
      const mapped = mapCsvRows(csvParsed);
      const invalid = mapped.filter((m) => m.errors.length > 0);
      const valid = mapped.filter((m) => m.errors.length === 0);
      if (valid.length === 0) {
        return NextResponse.json({ error: "No valid rows.", invalid: invalid.slice(0, 20), warnings: csvParsed.warnings }, { status: 400 });
      }
      const rows = valid.map((m) => ({
        front: m.values.front ?? "", back: m.values.back ?? m.values.definition ?? "",
        word: m.values.word ?? m.values.front ?? "", definition: m.values.definition ?? "",
        example: m.values.example ?? "", exampleTranslation: m.values.example_translation ?? "",
        partOfSpeech: m.values.partOfSpeech || null, level: (m.values.level?.toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1") || null,
        phonetic: m.values.phonetic ?? "", synonyms: splitList(m.values.synonyms ?? ""),
        antonyms: splitList(m.values.antonyms ?? ""), collocations: splitList(m.values.collocations ?? ""),
        grammarNotes: m.values.grammarNotes ?? "", personalNotes: m.values.personalNotes ?? "",
        tags: splitList(m.values.tags ?? ""), source: m.values.source || "csv",
      }));
      const summary = await applyImport(supabase, userId, params.id, rows as unknown as Array<Record<string, unknown>>, parsed.data.mode);
      return NextResponse.json({ summary, invalid: invalid.slice(0, 20), warnings: csvParsed.warnings });
    }
    return NextResponse.json({ error: 'Unknown format. Use "json", "csv" or "quick".' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Import failed." }, { status: 400 });
  }
}
