import { describe, expect, it } from "vitest";
import { GRAMMAR_TOPICS, getGrammarTopic, listGrammarTopics, gradeGrammarSelections, toPublicGrammarQuestions } from "@/lib/grammar/topics";
import { READING_PASSAGES, getReadingPassage, listReadingPassages, gradeReadingSelections, readingWordCount } from "@/lib/reading/library";
import { LISTENING_TRACKS, getListeningTrack, listListeningTracks, gradeListeningSelections, gradeDictation, normaliseDictation, dictationSentences } from "@/lib/listening/library";

describe("grammar library", () => {
  it("has 15 topics, 3 per level", () => {
    expect(GRAMMAR_TOPICS).toHaveLength(15);
    for (const lvl of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(listGrammarTopics(lvl)).toHaveLength(3);
    }
  });
  it("looks up slugs case-insensitively", () => {
    expect(getGrammarTopic("Present-Simple")?.level).toBe("A1");
    expect(getGrammarTopic("nope")).toBeNull();
  });
  it("every topic has 5 questions with valid answers", () => {
    for (const t of GRAMMAR_TOPICS) {
      expect(t.questions).toHaveLength(5);
      for (const x of t.questions) {
        expect(x.choices).toHaveLength(4);
        expect(x.choices[x.answer]).toBeDefined();
      }
    }
  });
  it("hides answers in public shape and grades by text match", () => {
    const t = getGrammarTopic("past-simple")!;
    const pub = toPublicGrammarQuestions(t);
    expect((pub[0] as Record<string, unknown>).answer).toBeUndefined();
    const good = t.questions.map((x) => ({ questionId: x.id, selected: x.choices.indexOf(x.choices[x.answer]), choices: x.choices }));
    const g = gradeGrammarSelections(t, good);
    expect(g.score).toBe(5);
    expect(g.perfect).toBe(true);
    expect(g.xpEarned).toBe(5 * 5 + 10);
    const wrong = good.map((s, i) => (i === 0 ? { ...s, selected: (s.selected + 1) % 4 } : s));
    expect(gradeGrammarSelections(t, wrong).score).toBe(4);
  });
});

describe("reading library", () => {
  it("has 10 passages, 2 per level", () => {
    expect(READING_PASSAGES).toHaveLength(10);
    for (const lvl of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(listReadingPassages(lvl)).toHaveLength(2);
    }
  });
  it("passages have real length and vocab focus", () => {
    for (const p of READING_PASSAGES) {
      expect(readingWordCount(p)).toBeGreaterThan(60);
      expect(p.vocabFocus.length).toBeGreaterThanOrEqual(4);
      expect(p.questions.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("grades comprehension perfectly with bonus", () => {
    const p = getReadingPassage("morning-routine")!;
    const sel = p.questions.map((x) => ({ questionId: x.id, selected: x.answer, choices: x.choices }));
    const g = gradeReadingSelections(p, sel);
    expect(g.score).toBe(p.questions.length);
    expect(g.xpEarned).toBe(p.questions.length * 8 + 10);
  });
  it("rejects unknown slugs", () => {
    expect(getReadingPassage("xyz")).toBeNull();
  });
});

describe("listening library", () => {
  it("has 10 tracks, 2 per level", () => {
    expect(LISTENING_TRACKS).toHaveLength(10);
    for (const lvl of ["A1", "A2", "B1", "B2", "C1"]) {
      expect(listListeningTracks(lvl, null)).toHaveLength(2);
    }
  });
  it("filters by kind", () => {
    expect(listListeningTracks(null, "dialogue").length).toBeGreaterThan(0);
    expect(listListeningTracks("A1", "podcast").length).toBe(0);
  });
  it("dictation sentences resolve and grade", () => {
    const t = getListeningTrack("at-the-cafe")!;
    const s = dictationSentences(t);
    expect(s).toHaveLength(2);
    expect(gradeDictation(s[0], s[0]).exact).toBe(true);
    expect(gradeDictation(s[0], s[0].toUpperCase() + "!!").exact).toBe(true);
    expect(normaliseDictation("  Hello,  WORLD! ")).toBe("hello world");
    const near = gradeDictation("a glass of water please", "a glass of watar please");
    expect(near.exact).toBe(false);
    expect(near.similarity).toBeGreaterThan(0.8);
  });
  it("grades listening comprehension by text match", () => {
    const t = getListeningTrack("weekend-plans")!;
    const sel = t.questions.map((x) => ({ questionId: x.id, selected: x.answer, choices: x.choices }));
    const g = gradeListeningSelections(t, sel);
    expect(g.score).toBe(3);
    expect(g.perfect).toBe(true);
  });
  it("rejects unknown slugs", () => {
    expect(getListeningTrack("nope")).toBeNull();
  });
});
