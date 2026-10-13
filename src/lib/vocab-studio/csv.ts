/** Flashcards Pro — robust CSV + bulk-text helpers. Pure, test-covered. */

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  warnings: string[];
}

const MAX_FILE_BYTES = 1_000_000; // 1 MB
const MAX_ROWS = 500;

export function assertFileSize(size: number): void {
  if (!Number.isFinite(size) || size < 0) throw new Error("Invalid file.");
  if (size === 0) throw new Error("File is empty.");
  if (size > MAX_FILE_BYTES) throw new Error("File is too large (max 1 MB).");
}

/**
 * RFC-4180-ish parser: handles quoted fields, escaped "" quotes,
 * embedded commas/newlines, CRLF. Returns headers + data rows.
 */
export function parseCsv(text: string): CsvParseResult {
  const warnings: string[] = [];
  if (!text || !text.trim()) throw new Error("File is empty.");
  if (text.length > MAX_FILE_BYTES) throw new Error("File is too large (max 1 MB).");

  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip, \n handles */ }
      else cur += ch;
    }
  }
  if (inQuotes) warnings.push("Unclosed quote detected — last field may be truncated.");
  row.push(cur);
  // Drop single trailing empty row from final newline
  if (row.length === 1 && row[0] === "" && rows.length > 0) { /* ignore */ }
  else rows.push(row);

  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (nonEmpty.length === 0) throw new Error("File is empty.");
  if (nonEmpty.length - 1 > MAX_ROWS) throw new Error(`Too many rows (max ${MAX_ROWS}).`);

  const headers = nonEmpty[0].map((h) => h.trim().toLowerCase());
  const data = nonEmpty.slice(1);
  // Pad ragged rows
  const width = headers.length;
  const padded = data.map((r, i) => {
    if (r.length < width) { warnings.push(`Row ${i + 2}: missing columns padded with empty values.`); return [...r, ...Array(width - r.length).fill("")]; }
    if (r.length > width) { warnings.push(`Row ${i + 2}: extra columns ignored.`); return r.slice(0, width); }
    return r;
  });
  return { headers, rows: padded, warnings };
}

export const CSV_TEMPLATE_HEADERS = [
  "front", "back", "word", "definition", "example",
  "example_translation", "part_of_speech", "level", "phonetic",
  "synonyms", "antonyms", "collocations", "grammar_notes",
  "personal_notes", "tags", "source",
];

export function csvTemplate(): string {
  const header = CSV_TEMPLATE_HEADERS.join(",");
  const sample = [
    "hello", "привет", "hello", "a greeting", "Hello, how are you?",
    "", "", "A1", "/həˈloʊ/", "hi|hey", "", "", "", "", "greetings", "template",
  ].map(escapeCsv).join(",");
  return `${header}\n${sample}\n`;
}

export function escapeCsv(v: string): string {
  if (v.includes('"') || v.includes(",") || v.includes("\n")) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function splitList(v: string): string[] {
  return v.split(/[|;]/).map((s) => s.trim()).filter(Boolean).slice(0, 20);
}

export interface MappedRow {
  index: number; // 1-based data-row number
  values: Record<string, string>;
  errors: string[];
}

/** Map parsed CSV rows to card fields using header names (case-insensitive, aliases supported). */
export function mapCsvRows(parsed: CsvParseResult): MappedRow[] {
  const alias: Record<string, string> = {
    front: "front", question: "front", term: "front",
    back: "back", answer: "back", translation: "back",
    word: "word", phrase: "word", term_text: "word",
    definition: "definition", meaning: "definition",
    example: "example", sentence: "example",
    example_translation: "example_translation", exampletranslation: "example_translation",
    part_of_speech: "partOfSpeech", pos: "partOfSpeech",
    level: "level", cefr: "level",
    phonetic: "phonetic", transcription: "phonetic",
    synonyms: "synonyms", antonyms: "antonyms", collocations: "collocations",
    grammar_notes: "grammarNotes", grammarnotes: "grammarNotes",
    personal_notes: "personalNotes", notes: "personalNotes",
    tags: "tags", source: "source",
  };
  const colToField = parsed.headers.map((h) => alias[h.replace(/\s+/g, "")] ?? "");
  return parsed.rows.map((cells, i) => {
    const values: Record<string, string> = {};
    cells.forEach((c, ci) => {
      const f = colToField[ci];
      if (f) values[f] = (values[f] ? `${values[f]} ` : "") + c.trim();
    });
    const errors: string[] = [];
    if (!values.front) errors.push("front is required");
    if (!values.back && !values.definition) errors.push("back or definition is required");
    if (!values.word) values.word = values.front || "";
    if (!values.word) errors.push("word is required");
    if (values.level && !["A1", "A2", "B1", "B2", "C1"].includes(values.level.toUpperCase())) {
      errors.push(`invalid level "${values.level}"`);
    }
    return { index: i + 1, values, errors };
  });
}

export function toCsv(rows: Array<Record<string, unknown>>): string {
  const lines = [CSV_TEMPLATE_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(CSV_TEMPLATE_HEADERS.map((h) => {
      const camel = h.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      const v = (r[h] ?? r[camel] ?? "") as unknown;
      const s = Array.isArray(v) ? v.join("|") : String(v ?? "");
      return escapeCsv(s);
    }).join(","));
  }
  return lines.join("\n") + "\n";
}

/**
 * Quick multiline entry. Supported per-line formats:
 *  - `front | back`
 *  - `front | back | example`
 *  - `word — definition` / `word - definition` / `word: definition`
 * Empty lines are skipped.
 */
export function parseBulkLines(text: string): Array<{ front: string; back: string; word: string }> {
  const out: Array<{ front: string; back: string; word: string }> = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    let front = "", back = "";
    if (line.includes("|")) {
      const parts = line.split("|").map((s) => s.trim());
      front = parts[0] ?? "";
      back = parts.slice(1).join(" | ").trim();
    } else {
      const m = line.match(/^(.+?)\s*[—–\-:]\s*(.+)$/);
      if (m) { front = m[1].trim(); back = m[2].trim(); }
      else { front = line; back = line; }
    }
    if (!front || !back) continue;
    out.push({ front, back, word: front.slice(0, 200) });
    if (out.length >= MAX_ROWS) break;
  }
  return out;
}

export function detectDuplicates<T>(rows: T[], key: (r: T) => string): Map<string, number[]> {
  const seen = new Map<string, number[]>();
  rows.forEach((r, i) => {
    const k = key(r).trim().toLowerCase();
    if (!k) return;
    seen.set(k, [...(seen.get(k) ?? []), i]);
  });
  const dups = new Map<string, number[]>();
  for (const entry of Array.from(seen.entries())) {
    const k = entry[0]; const idx = entry[1];
    if (idx.length > 1) dups.set(k, idx);
  }
  return dups;
}
