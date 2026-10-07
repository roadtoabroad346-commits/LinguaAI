import { describe, expect, it } from "vitest";
import { analyzeSpeaking, analyzeReadAloud, xpForSpeaking, normalizeWords } from "./analyze";
import { SPEAKING_TOPICS, getSpeakingTopic, listSpeakingTopics, countWords } from "./topics";

describe("speaking topics", () => {
  it("has 10 topics, 2 per level", () => {
    expect(SPEAKING_TOPICS).toHaveLength(10);
    for (const lvl of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(SPEAKING_TOPICS.filter((t) => t.level === lvl)).toHaveLength(2);
    }
  });
  it("looks up and filters topics", () => {
    expect(getSpeakingTopic("my-morning")?.title).toBe("My Morning");
    expect(getSpeakingTopic("nope")).toBeNull();
    expect(listSpeakingTopics("B1")).toHaveLength(2);
    expect(listSpeakingTopics("all")).toHaveLength(10);
  });
  it("counts words", () => {
    expect(countWords("  hello   world ")).toBe(2);
    expect(countWords("")).toBe(0);
  });
});

describe("analyzeSpeaking", () => {
  it("scores empty transcript at minimum", () => {
    const a = analyzeSpeaking("", { minWords: 25, durationSecs: 30 });
    expect(a.score).toBe(10);
    expect(a.wordCount).toBe(0);
  });
  it("rewards good fluent answer", () => {
    const text = "Last weekend I went to the lake with my family. First we walked around the water because the weather was beautiful. For example, we saw ducks and small boats. It was a wonderful day and I enjoyed it a lot.";
    const a = analyzeSpeaking(text, { minWords: 45, durationSecs: 45 });
    expect(a.score).toBeGreaterThanOrEqual(70);
    expect(a.fillerCount).toBe(0);
    expect(a.wpm).toBeGreaterThan(0);
  });
  it("penalizes fillers and short answers", () => {
    const short = analyzeSpeaking("Um I like uh football", { minWords: 45, durationSecs: 20 });
    const good = analyzeSpeaking("Last weekend I went to the lake with my family. First we walked around the water because the weather was beautiful. For example, we saw ducks and small boats. It was wonderful.", { minWords: 45, durationSecs: 45 });
    expect(short.score).toBeLessThan(good.score);
    expect(short.issues.length).toBeGreaterThan(0);
  });
  it("detects repeated words and missing linkers", () => {
    const a = analyzeSpeaking("I went to to the park park yesterday and it was very very very very very very nice nice nice nice nice nice nice nice nice nice nice nice nice nice day with many many many many many many many many many many words here today", { minWords: 25, durationSecs: 60 });
    expect(a.repetitionCount).toBeGreaterThan(0);
    expect(a.uniqueRatio).toBeLessThan(0.6);
  });
  it("computes wpm from duration", () => {
    const words = Array(60).fill("word").join(" ");
    const a = analyzeSpeaking(words + " extra unique vocabulary delight wonderful journey because however", { minWords: 25, durationSecs: 30 });
    expect(a.wpm).toBeGreaterThanOrEqual(100);
  });
  it("xp scale matches writing", () => {
    expect(xpForSpeaking(20)).toBe(8);
    expect(xpForSpeaking(60)).toBe(12);
    expect(xpForSpeaking(80)).toBe(17);
    expect(xpForSpeaking(95)).toBe(22);
  });
});

describe("analyzeReadAloud", () => {
  const passage = "I wake up at seven. I make coffee.";
  it("scores perfect reading near max", () => {
    const a = analyzeReadAloud(passage, passage, 10);
    expect(a.accuracy).toBe(100);
    expect(a.score).toBeGreaterThanOrEqual(90);
    expect(a.missedWords).toHaveLength(0);
  });
  it("detects missed words", () => {
    const a = analyzeReadAloud(passage, "I wake up", 10);
    expect(a.accuracy).toBeLessThan(100);
    expect(a.missedWords.length).toBeGreaterThan(0);
    expect(a.score).toBeLessThan(90);
  });
  it("handles empty transcript", () => {
    const a = analyzeReadAloud(passage, "", 0);
    expect(a.accuracy).toBe(0);
    expect(a.score).toBe(10);
  });
  it("normalizes punctuation and case", () => {
    expect(normalizeWords("Hello, WORLD!")).toEqual(["hello", "world"]);
  });
});
