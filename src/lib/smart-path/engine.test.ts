/** Phase 8 — Smart Path engine tests (pure, deterministic). */
import { describe, expect, it } from "vitest";
import {
  buildPreviewSmartPath,
  buildSmartPath,
  pickContent,
  stepDown,
  type SmartPathInput,
} from "./engine";

function baseInput(overrides: Partial<SmartPathInput> = {}): SmartPathInput {
  return {
    level: "B1",
    learningMode: "guided",
    goals: [],
    todayKey: "2026-10-05",
    skills: [],
    weakAreas: [],
    dueWords: [],
    totalWords: 0,
    avgMastery: null,
    worstSlugs: [],
    writingErrors: [],
    misspelledWords: [],
    recentKinds: [],
    recentSlugs: [],
    challengeDone: true,
    xpToday: 0,
    dailyGoalXp: 30,
    streak: 0,
    writingDaysAgo: 0,
    speakingDaysAgo: 0,
    ...overrides,
  };
}

describe("stepDown", () => {
  it("steps one level down and floors at A1", () => {
    expect(stepDown("C1")).toBe("B2");
    expect(stepDown("B1")).toBe("A2");
    expect(stepDown("A1")).toBe("A1");
  });
});

describe("pickContent", () => {
  const pool = [
    { slug: "b-topic", level: "B1" as const, title: "B" },
    { slug: "a-topic", level: "A2" as const, title: "A" },
    { slug: "a-second", level: "A2" as const, title: "A2" },
  ];
  it("prefers unattempted slugs at the target level (deterministic slug order)", () => {
    const pick = pickContent(pool, "A1", ["a-second"], false);
    expect(pick?.slug).toBe("a-topic");
  });
  it("eases down a level for remediation", () => {
    const pick = pickContent(pool, "B1", [], true);
    expect(pick?.slug).toBe("a-second");
    expect(pick?.remedial).toBe(true);
  });
  it("falls back to the nearest level when the target has no content", () => {
    const pick = pickContent(pool, "C1", [], false);
    expect(pick?.slug).toBe("b-topic");
  });
});

describe("buildSmartPath", () => {
  it("puts due-word review first", () => {
    const plan = buildSmartPath(
      baseInput({
        dueWords: [
          { word: "bright", mastery: 10, nextReviewAt: "2026-10-01" },
          { word: "habit", mastery: 20, nextReviewAt: "2026-10-02" },
        ],
        totalWords: 12,
      })
    );
    expect(plan.steps[0].kind).toBe("review");
    expect(plan.steps[0].href).toBe("/flashcards");
    expect(plan.steps[0].reason).toContain("2 words");
  });

  it("adds the Daily Challenge when not done", () => {
    const plan = buildSmartPath(baseInput({ challengeDone: false }));
    expect(plan.steps.some((s) => s.href === "/daily-challenge")).toBe(true);
  });

  it("targets the weakest skill with its worst slug", () => {
    const plan = buildSmartPath(
      baseInput({
        skills: [{ skill: "grammar", label: "Grammar", attempts: 2, accuracyPct: 40, href: "/grammar", note: "accuracy" }],
        weakAreas: [{ skill: "grammar", label: "Grammar", reason: "40% accuracy — needs work", href: "/grammar" }],
        worstSlugs: [{ skill: "grammar", slug: "past-simple", title: "Past Simple", accuracyPct: 20, attempts: 2 }],
      })
    );
    const step = plan.steps.find((s) => s.kind === "weak-skill");
    expect(step?.href).toBe("/grammar/past-simple");
    expect(step?.reason).toContain("Past Simple");
  });

  it("re-drills the weakest pronunciation drill", () => {
    const plan = buildSmartPath(
      baseInput({
        skills: [{ skill: "pronunciation", label: "Pronunciation", attempts: 2, accuracyPct: 40, href: "/pronunciation", note: "accuracy" }],
        weakAreas: [{ skill: "pronunciation", label: "Pronunciation", reason: "40% accuracy — needs work", href: "/pronunciation" }],
        worstSlugs: [{ skill: "pronunciation", slug: "ship-sheep", title: "Ship vs Sheep", accuracyPct: 20, attempts: 2 }],
      })
    );
    const step = plan.steps.find((s) => s.kind === "weak-skill");
    expect(step?.href).toBe("/pronunciation/ship-sheep");
    expect(step?.reason).toContain("Ship vs Sheep");
  });

  it("eases remediation down a level when accuracy is very low", () => {
    const plan = buildSmartPath(
      baseInput({
        level: "B1",
        skills: [{ skill: "reading", label: "Reading", attempts: 3, accuracyPct: 25, href: "/reading", note: "accuracy" }],
        weakAreas: [{ skill: "reading", label: "Reading", reason: "25% accuracy — needs work", href: "/reading" }],
        worstSlugs: [],
      })
    );
    const step = plan.steps.find((s) => s.kind === "weak-skill");
    expect(step?.level).toBe("A2");
    expect(step?.reason).toContain("easing down");
  });

  it("surfaces recurring writing errors as a mistake step", () => {
    const plan = buildSmartPath(
      baseInput({
        skills: [{ skill: "grammar", label: "Grammar", attempts: 2, accuracyPct: 90, href: "/grammar", note: "accuracy" }],
        weakAreas: [{ skill: "grammar", label: "Grammar", reason: "90% accuracy — needs work", href: "/grammar" }],
        writingErrors: [{ category: "articles", count: 4 }],
      })
    );
    expect(plan.steps.some((s) => s.href === "/writing" && s.reason.includes("articles"))).toBe(true);
  });

  it("nudges stale productive skills", () => {
    const plan = buildSmartPath(baseInput({ writingDaysAgo: 9, speakingDaysAgo: 1 }));
    expect(plan.steps.some((s) => s.href === "/writing" && s.kind === "productive")).toBe(true);
  });

  it("avoids repeating recently attempted slugs", () => {
    const plan = buildSmartPath(
      baseInput({
        recentSlugs: ["curious-inventor", "hard-decision"],
        recentKinds: ["reading"],
        level: "B1",
      })
    );
    const hrefs = plan.steps.map((s) => s.href);
    expect(hrefs.some((h) => h.includes("curious-inventor"))).toBe(false);
    expect(hrefs.some((h) => h.includes("hard-decision"))).toBe(false);
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it("always returns at least one step for a brand-new learner", () => {
    const plan = buildSmartPath(baseInput({ level: null, challengeDone: false }));
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.steps.length).toBeLessThanOrEqual(5);
  });

  it("caps at 5 steps and 45 minutes", () => {
    const plan = buildSmartPath(
      baseInput({
        challengeDone: false,
        dueWords: Array.from({ length: 20 }, (_, i) => ({ word: `w${i}`, mastery: 5, nextReviewAt: "2026-01-01" })),
        weakAreas: [{ skill: "grammar", label: "Grammar", reason: "weak", href: "/grammar" }],
        skills: [{ skill: "grammar", label: "Grammar", attempts: 2, accuracyPct: 50, href: "/grammar", note: "accuracy" }],
        worstSlugs: [{ skill: "grammar", slug: "past-simple", title: "Past Simple", accuracyPct: 30, attempts: 2 }],
        writingErrors: [{ category: "tense", count: 3 }],
        misspelledWords: [{ word: "necessary", misses: 2 }],
        writingDaysAgo: 10,
        speakingDaysAgo: 10,
      })
    );
    expect(plan.steps.length).toBeLessThanOrEqual(5);
    expect(plan.meta.totalMinutes).toBeLessThanOrEqual(45);
    // No duplicate destinations.
    expect(new Set(plan.steps.map((s) => s.href)).size).toBe(plan.steps.length);
  });

  it("is deterministic for the same input", () => {
    const input = baseInput({ challengeDone: false, dueWords: [{ word: "bright", mastery: 5, nextReviewAt: null }], totalWords: 3 });
    expect(buildSmartPath(input)).toEqual(buildSmartPath(input));
  });
});

describe("buildPreviewSmartPath", () => {
  it("returns a level-aware starter plan without backend data", () => {
    const plan = buildPreviewSmartPath("A2", "2026-10-05");
    expect(plan.steps.length).toBeGreaterThanOrEqual(3);
    expect(plan.steps[0].href).toBe("/daily-challenge");
    expect(plan.meta.level).toBe("A2");
  });
});
