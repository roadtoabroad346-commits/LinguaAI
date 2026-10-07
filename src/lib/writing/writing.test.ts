import { describe, expect, it } from "vitest";
import { WRITING_TASKS, getWritingTask, listWritingTasks, countWords } from "./tasks";
import { analyzeWriting, xpForWriting } from "./analyze";
import { buildTeacherSystemPrompt, fallbackTeacherReply, buildHistorySlice } from "@/lib/teacher/teacher";

describe("writing tasks", () => {
  it("has 10 tasks, 2 per level", () => {
    expect(WRITING_TASKS).toHaveLength(10);
    for (const l of ["A1", "A2", "B1", "B2", "C1"]) expect(listWritingTasks(l)).toHaveLength(2);
  });
  it("looks up slugs and counts words", () => {
    expect(getWritingTask("phones-opinion")?.level).toBe("B1");
    expect(getWritingTask("nope")).toBeNull();
    expect(countWords("  hello   world ")).toBe(2);
    expect(countWords("")).toBe(0);
  });
});

describe("analyzeWriting", () => {
  it("flags basic errors deterministically", () => {
    const a = analyzeWriting("i go to school teh school is good", { minWords: 50, level: "A1" });
    expect(a.wordCount).toBeGreaterThan(0);
    expect(a.errors.some((e) => e.category === "spelling")).toBe(true);
    expect(a.errors.some((e) => e.category === "punctuation")).toBe(true);
    expect(a.score).toBeLessThan(100);
    expect(a.improvedText).toMatch(/I go/);
    expect(a.improvedText.endsWith(".")).toBe(true);
  });
  it("detects repeated words and long sentences", () => {
    const a = analyzeWriting("I like like apples. " + "This is a very long sentence with many many words that keeps going and going and going without end really truly indeed. ", { minWords: 10, level: "B1" });
    expect(a.errors.some((e) => e.message.includes("Repeated"))).toBe(true);
  });
  it("rewards clean on-target text", () => {
    const a = analyzeWriting("In my opinion, phones should stay silent at school. For example, students focus better without notifications. However, they can use them after class.", { minWords: 20, level: "B1" });
    expect(a.score).toBeGreaterThanOrEqual(70);
    expect(a.wordCount).toBeGreaterThan(15);
  });
  it("xp scales with score", () => {
    expect(xpForWriting(20)).toBe(8);
    expect(xpForWriting(50)).toBe(12);
    expect(xpForWriting(75)).toBe(17);
    expect(xpForWriting(95)).toBe(22);
  });
});

describe("ai teacher", () => {
  it("builds a compact level-aware system prompt", () => {
    const p = buildTeacherSystemPrompt({ level: "B1", goals: ["speaking"] });
    expect(p).toContain("B1");
    expect(p).toContain("speaking");
  });
  it("fallback answers without AI", () => {
    expect(fallbackTeacherReply("explain present simple vs continuous")).toContain("present simple");
    expect(fallbackTeacherReply("something totally random xyz")).toContain("offline mode");
  });
  it("slices history compactly", () => {
    const h = buildHistorySlice(Array.from({ length: 20 }, (_, i) => ({ role: "user", content: `msg ${i} ` + "x".repeat(1000) })));
    expect(h.length).toBeLessThan(6000);
  });
});
