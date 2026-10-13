import { describe, expect, it } from "vitest";
import {
  gradePlacementV3,
  percentToLevel,
  summarizeV3,
} from "@/lib/placement/scoring";
import {
  getPlacementListening,
  getPlacementReading,
  getPlacementSpelling,
  PLACEMENT_PRONUNCIATION,
  PLACEMENT_SPEAKING,
  PLACEMENT_TEST_VERSION,
  PLACEMENT_WRITING,
} from "@/lib/placement/sections";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import {
  clearDraft,
  draftKey,
  draftOwner,
  loadDraft,
  newDraft,
  saveDraft,
} from "@/lib/placement/draft";
import { placementSubmitSchema } from "@/lib/auth/schemas";

function memStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

function perfectObjective() {
  const reading = getPlacementReading().map((r) => {
    // Find the real answer from the bank by re-deriving choices order.
    return { questionId: r.questionId, selected: 0, _choices: r.choices };
  });
  void reading;
  return null;
}

describe("placement v3 content", () => {
  it("has stable version + all sections", () => {
    expect(PLACEMENT_TEST_VERSION).toBe("v3-multi");
    expect(getPlacementReading()).toHaveLength(6);
    expect(getPlacementListening()).toHaveLength(6);
    expect(getPlacementSpelling()).toHaveLength(8);
    expect(PLACEMENT_QUESTIONS).toHaveLength(20);
    expect(PLACEMENT_WRITING.minWords).toBeGreaterThanOrEqual(30);
    expect(PLACEMENT_SPEAKING.minWords).toBeGreaterThanOrEqual(20);
    expect(PLACEMENT_PRONUNCIATION.text.split(/\s+/).length).toBeGreaterThanOrEqual(20);
  });

  it("reading/listening reference real bank content", () => {
    for (const r of getPlacementReading()) {
      expect(r.passageSlug.length).toBeGreaterThan(0);
      expect(r.choices.length).toBeGreaterThanOrEqual(3);
    }
    for (const l of getPlacementListening()) {
      expect(l.lines.length).toBeGreaterThan(0);
      expect(l.choices.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("spelling covers A1..C1 with choice + type", () => {
    const items = getPlacementSpelling();
    const kinds = new Set(items.map((x) => x.kind));
    expect(kinds.has("choice")).toBe(true);
    expect(kinds.has("type")).toBe(true);
    for (const s of items) {
      expect(s.word.length).toBeGreaterThan(1);
      if (s.kind === "choice") expect(s.choices).toHaveLength(4);
    }
  });
});

describe("percentToLevel", () => {
  it("maps reproducibly", () => {
    expect(percentToLevel(0)).toBe("A1");
    expect(percentToLevel(29)).toBe("A1");
    expect(percentToLevel(30)).toBe("A2");
    expect(percentToLevel(49)).toBe("A2");
    expect(percentToLevel(50)).toBe("B1");
    expect(percentToLevel(69)).toBe("B1");
    expect(percentToLevel(70)).toBe("B2");
    expect(percentToLevel(84)).toBe("B2");
    expect(percentToLevel(85)).toBe("C1");
    expect(percentToLevel(100)).toBe("C1");
  });
});

describe("gradePlacementV3", () => {
  it("is deterministic: same input, same grade", () => {
    const input = {
      grammar: PLACEMENT_QUESTIONS.slice(0, 5).map((q) => ({ questionId: q.id, selected: q.answer })),
      writingText: "Last weekend I went to the park with my friends. First we walked a lot, then we ate ice cream. It was a great day because the weather was sunny.",
      speakingTranscript: "I enjoy football in my free time because it is fun and healthy. I usually play with friends on Saturdays.",
      speakingSecs: 30,
      pronunciationTranscript: PLACEMENT_PRONUNCIATION.text,
      pronunciationSecs: 30,
    };
    const a = gradePlacementV3(input);
    const b = gradePlacementV3(input);
    expect(a).toEqual(b);
    expect(a.version).toBe("v3-multi");
  });

  it("marks insufficient when fewer than 4 skills answered", () => {
    const g = gradePlacementV3({
      grammar: [{ questionId: "a1-1", selected: 1 }],
    });
    expect(g.overall.insufficient).toBe(true);
    expect(g.overall.coverage).toBeLessThan(4);
    expect(summarizeV3(g)).toContain("Insufficient data");
  });

  it("computes a full grade without false precision on skips", () => {
    const g = gradePlacementV3({
      grammar: PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selected: q.answer })),
      reading: getPlacementReading().map((r) => ({ questionId: r.questionId, selected: 0 })),
      writingText: "",
      speakingTranscript: "",
      pronunciationTranscript: "",
    });
    // Grammar answered, reading answered (even if wrong), productive empty.
    expect(g.skills.grammar.answered).toBe(true);
    expect(g.skills.writing.answered).toBe(false);
    expect(g.skills.speaking.answered).toBe(false);
    // Unanswered skills are excluded from the mean, never zero-filled.
    expect(g.overall.coverage).toBe(2);
    expect(g.overall.insufficient).toBe(true);
  });

  it("does not let one strong skill hide gaps", () => {
    const readingItems = getPlacementReading();
    const listeningItems = getPlacementListening();
    const g = gradePlacementV3({
      grammar: PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selected: q.answer })),
      // Reading: all wrong -> A1, while the rest stays mid/high so overall lands B1+.
      reading: readingItems.map((r) => ({ questionId: r.questionId, selected: 99 as unknown as number })),
      listening: listeningItems.map((r, i) => ({ questionId: r.questionId, selected: i % 2 === 0 ? 0 : 1 })),
      spelling: getPlacementSpelling().map((s) => ({ slug: s.slug, typed: s.word })),
      writingText:
        "Last weekend I visited my grandparents in the village. First we cooked dinner together, then we walked in the park near the river. It was a warm evening and we talked a lot about school and future plans. I really enjoyed the trip because we laughed a lot.",
      speakingTranscript:
        "I enjoy playing football with my friends every Saturday because it keeps me healthy and happy. We usually meet in the park near my house and play for two hours. After that we drink tea together.",
      speakingSecs: 45,
      pronunciationTranscript: PLACEMENT_PRONUNCIATION.text,
      pronunciationSecs: 40,
    });
    // Grammar strong, reading weak -> per-skill breakdown must expose the gap.
    expect(g.skills.grammar.score).toBeGreaterThan(g.skills.reading.score);
    expect(g.skills.reading.level).toBe("A1");
    // Overall should be above A1 so the gap is meaningful and surfaced.
    expect(["B1", "B2", "C1"].includes(g.overall.level)).toBe(true);
    expect(g.overall.gaps).toContain("reading");
  });

  it("grades writing/speaking/pronunciation honestly on short input", () => {
    const g = gradePlacementV3({ writingText: "hi", speakingTranscript: "hi", pronunciationTranscript: "hi" });
    expect(g.skills.writing.answered).toBe(false);
    expect(g.skills.speaking.answered).toBe(false);
    expect(g.skills.pronunciation.answered).toBe(false);
    expect(g.skills.speaking.confidence).toBe("low");
  });

  it("ignores unknown ids and duplicates", () => {
    const g = gradePlacementV3({
      grammar: [
        { questionId: "nope", selected: 0 },
        { questionId: "a1-1", selected: PLACEMENT_QUESTIONS[0].answer },
        { questionId: "a1-1", selected: 0 },
      ],
      reading: [
        { questionId: "nope-r", selected: 0 },
        { questionId: getPlacementReading()[0].questionId, selected: 0 },
        { questionId: getPlacementReading()[0].questionId, selected: 1 },
      ],
    });
    expect(g.skills.grammar.correct).toBeLessThanOrEqual(1);
  });

  it("never throws on empty input", () => {
    expect(() => gradePlacementV3({})).not.toThrow();
    const g = gradePlacementV3({});
    expect(g.overall.insufficient).toBe(true);
    expect(g.level).toBe("A1");
  });
});

describe("placement submit schema v3", () => {
  it("accepts legacy grammar-only payloads", () => {
    expect(
      placementSubmitSchema.safeParse({ answers: [{ questionId: "a1-1", selected: 1 }] }).success
    ).toBe(true);
  });

  it("accepts full v3 payloads and rejects empty ones (no fake success)", () => {
    const full = {
      answers: [{ questionId: "a1-1", selected: 1 }],
      reading: [{ questionId: "x-rq1", selected: 0 }],
      listening: [{ questionId: "y-lq1", selected: 1 }],
      spelling: [{ slug: "journey", typed: "journey" }],
      writingText: "Last weekend I went to the park with friends and we had a great time together.",
      speakingTranscript: "I enjoy reading books in my free time because stories are interesting.",
      speakingSecs: 20,
      pronunciationTranscript: "The market opens early every Sunday.",
      pronunciationSecs: 10,
      testVersion: "v3-multi",
      idempotencyKey: "12345678-abcdef",
    };
    expect(placementSubmitSchema.safeParse(full).success).toBe(true);
    expect(placementSubmitSchema.safeParse({ answers: [] }).success).toBe(false);
    expect(placementSubmitSchema.safeParse({}).success).toBe(false);
  });
});

describe("placement draft (autosave + resume + isolation)", () => {
  it("round-trips progress and survives a simulated refresh", () => {
    const s = memStore();
    const d = newDraft("key-12345678");
    d.answers = { "a1-1": 1 };
    d.reading = { "brave-choice-rq1": 0 };
    d.writingText = "Last weekend I went home and saw my family.";
    d.sectionIndex = 4;
    saveDraft(s, "guest", d);
    const back = loadDraft(s, "guest");
    expect(back?.answers).toEqual({ "a1-1": 1 });
    expect(back?.writingText).toContain("Last weekend");
    expect(back?.sectionIndex).toBe(4);
    expect(back?.attemptKey).toBe("key-12345678");
  });

  it("isolates users: guest draft never leaks into another account", () => {
    expect(draftKey("guest")).not.toBe(draftKey("user:abc"));
    expect(draftKey("user:abc")).not.toBe(draftKey("user:def"));
    expect(draftOwner(false)).toBe("guest");
    expect(draftOwner(true, "abc")).toBe("user:abc");
  });

  it("drops completed or stale drafts (completed stays completed, no restart)", () => {
    const s = memStore();
    const d = newDraft("key-12345678");
    d.answers = { "a1-1": 1 };
    saveDraft(s, "guest", d);
    // Completed drafts are never resumed.
    const raw = JSON.parse(
      (s.getItem(draftKey("guest")) as string) as string
    ) as Record<string, unknown>;
    raw.status = "completed";
    s.setItem(draftKey("guest"), JSON.stringify(raw));
    expect(loadDraft(s, "guest")).toBeNull();
    clearDraft(s, "guest");
    expect(loadDraft(s, "guest")).toBeNull();
  });

  it("rejects version mismatches and corrupt payloads", () => {
    const s = memStore();
    s.setItem(draftKey("guest"), "not-json");
    expect(loadDraft(s, "guest")).toBeNull();
    s.setItem(draftKey("guest"), JSON.stringify({ version: 999, attemptKey: "x" }));
    expect(loadDraft(s, "guest")).toBeNull();
  });
});

describe("placement v3 scoring helpers", () => {
  it("summarizes insufficient vs full results distinctly", () => {
    const thin = gradePlacementV3({});
    expect(summarizeV3(thin)).toContain("Insufficient data");
    const full = gradePlacementV3({
      grammar: PLACEMENT_QUESTIONS.map((q) => ({ questionId: q.id, selected: q.answer })),
      reading: getPlacementReading().map((r, i) => ({
        questionId: r.questionId,
        selected: i % 2,
      })),
      listening: getPlacementListening().map((r, i) => ({
        questionId: r.questionId,
        selected: i % 2,
      })),
      spelling: getPlacementSpelling().map((x) => ({ slug: x.slug, typed: x.word })),
      writingText:
        "Last weekend I visited my grandparents. First we cooked dinner together, then we walked in the park. It was a warm evening and we talked a lot about school.",
      speakingTranscript:
        "I enjoy playing football with my friends every Saturday because it keeps me healthy and happy. We usually meet in the park near my house.",
      speakingSecs: 40,
      pronunciationTranscript: PLACEMENT_PRONUNCIATION.text,
      pronunciationSecs: 40,
    });
    expect(full.overall.coverage).toBeGreaterThanOrEqual(4);
    expect(summarizeV3(full)).toContain("Estimated");
    expect(summarizeV3(full)).toContain("not an official certification");
  });
});

void perfectObjective;
