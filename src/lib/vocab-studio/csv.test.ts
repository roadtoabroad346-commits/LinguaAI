import { describe, expect, it } from "vitest";
import { parseCsv, mapCsvRows, toCsv, parseBulkLines, detectDuplicates, csvTemplate, assertFileSize } from "./csv";

describe("vocab-studio csv", () => {
  it("parses quoted fields with commas and escaped quotes", () => {
    const p = parseCsv('front,back\n"hello, world","hi ""there"""\nbye,goodbye\n');
    expect(p.headers).toEqual(["front", "back"]);
    expect(p.rows[0]).toEqual(["hello, world", 'hi "there"']);
    expect(p.rows[1]).toEqual(["bye", "goodbye"]);
  });

  it("rejects empty files and enforces size limits", () => {
    expect(() => parseCsv("   ")).toThrow("empty");
    expect(() => assertFileSize(0)).toThrow();
    expect(() => assertFileSize(2_000_000)).toThrow("too large");
  });

  it("maps aliases and flags invalid rows", () => {
    const p = parseCsv("term,translation,cefr\nhello,привет,A1\n,bad,\nfoo,bar,ZZ\n");
    const mapped = mapCsvRows(p);
    expect(mapped[0].errors).toEqual([]);
    expect(mapped[0].values.word).toBe("hello");
    expect(mapped[1].errors.length).toBeGreaterThan(0);
    expect(mapped[2].errors.join()).toContain("level");
  });

  it("round-trips csv export", () => {
    const csv = toCsv([{ front: "a,b", back: 'q"q', word: "a", definition: "", example: "" }]);
    expect(csv).toContain('"a,b"');
    expect(csv).toContain('"q""q"');
  });

  it("parses bulk lines (pipe and dash formats, skips empties)", () => {
    const rows = parseBulkLines("hello | привет\n\nworld — мир\nlonely\n");
    expect(rows.length).toBe(3);
    expect(rows[0]).toMatchObject({ front: "hello", back: "привет" });
    expect(rows[1]).toMatchObject({ front: "world", back: "мир" });
  });

  it("detects duplicates case-insensitively", () => {
    const d = detectDuplicates([{ w: "Hello" }, { w: "hello" }, { w: "bye" }], (r) => r.w);
    expect(d.has("hello")).toBe(true);
    expect(d.has("bye")).toBe(false);
  });

  it("template has required headers", () => {
    expect(csvTemplate()).toContain("front,back,word");
  });
});
