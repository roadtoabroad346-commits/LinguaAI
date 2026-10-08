import { describe, expect, it } from "vitest";
import { ACHIEVEMENTS, computeSkillScores, DAILY_GOAL_OPTIONS, evaluateAchievements, findWeakAreas, getXpLevel, goalProgressPct, isValidDailyGoal, masteryStats, spellingAccuracy, type GamStats } from "./gamification";
import { XP_RULES, xpForGradedSet, xpFromBands } from "./xp-rules";

const BASE: GamStats = {
  totalXp: 0, streakCurrent: 0, longestStreak: 0, challengeCompletions: 0,
  challengePerfect: 0, spellingCorrect: 0, spellingPerfectSessions: 0, dictionaryCount: 0,
};

describe("getXpLevel", () => {
  it("starts at Novice", () => {
    expect(getXpLevel(0).name).toBe("Novice");
  });
  it("steps up at thresholds", () => {
    expect(getXpLevel(100).name).toBe("Explorer");
    expect(getXpLevel(1000).name).toBe("Pathfinder");
    expect(getXpLevel(9999).name).toBe("Legend");
  });
  it("reports progress toward next level", () => {
    const l = getXpLevel(150);
    expect(l.nextMin).toBe(300);
    expect(l.progressPct).toBeGreaterThan(0);
    expect(l.progressPct).toBeLessThan(100);
  });
  it("caps at 100 for max level", () => {
    expect(getXpLevel(99999).progressPct).toBe(100);
  });
});

describe("achievements", () => {
  it("defines at least 10 achievements with unique keys", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length);
  });
  it("unlocks first-steps at 10 XP", () => {
    expect(evaluateAchievements({ ...BASE, totalXp: 10 }, [])).toContain("first-steps");
    expect(evaluateAchievements(BASE, [])).not.toContain("first-steps");
  });
  it("unlocks streak achievements", () => {
    expect(evaluateAchievements({ ...BASE, longestStreak: 7 }, [])).toContain("streak-7");
    expect(evaluateAchievements({ ...BASE, longestStreak: 7 }, [])).toContain("streak-3");
    expect(evaluateAchievements({ ...BASE, longestStreak: 7 }, [])).not.toContain("streak-14");
  });
  it("skips already-unlocked keys", () => {
    expect(evaluateAchievements({ ...BASE, totalXp: 50 }, ["first-steps"])).not.toContain("first-steps");
  });
  it("unlocks spelling achievements", () => {
    expect(evaluateAchievements({ ...BASE, spellingPerfectSessions: 1 }, [])).toContain("spelling-bee");
    expect(evaluateAchievements({ ...BASE, spellingCorrect: 50 }, [])).toContain("spelling-grinder");
  });
  it("unlocks challenge achievements", () => {
    expect(evaluateAchievements({ ...BASE, challengeCompletions: 1, challengePerfect: 1 }, [])).toEqual(
      expect.arrayContaining(["warm-up", "perfect-day"])
    );
  });
});

describe("daily goals", () => {
  it("offers preset options within 10-200", () => {
    for (const g of DAILY_GOAL_OPTIONS) expect(isValidDailyGoal(g)).toBe(true);
  });
  it("validates bounds", () => {
    expect(isValidDailyGoal(10)).toBe(true);
    expect(isValidDailyGoal(200)).toBe(true);
    expect(isValidDailyGoal(9)).toBe(false);
    expect(isValidDailyGoal(201)).toBe(false);
  });
  it("computes progress pct", () => {
    expect(goalProgressPct(15, 30)).toBe(50);
    expect(goalProgressPct(99, 30)).toBe(100);
    expect(goalProgressPct(0, 30)).toBe(0);
  });
});

describe("central XP rules", () => {
  it("holds every module's values in one place", () => {
    expect(XP_RULES.spelling).toEqual({ perCorrect: 5, bonus: 10 });
    expect(XP_RULES.vocabPractice).toEqual({ perCorrect: 5, bonus: 10 });
    expect(XP_RULES.dailyChallenge).toEqual({ perCorrect: 10, bonus: 10 });
    expect(XP_RULES.grammar).toEqual({ perCorrect: 5, bonus: 10 });
    expect(XP_RULES.reading).toEqual({ perCorrect: 8, bonus: 10 });
    expect(XP_RULES.listening).toEqual({ perCorrect: 8, bonus: 10 });
    expect(XP_RULES.dictation).toEqual({ exactXp: 5 });
    expect(XP_RULES.challengeAttempt).toBe(1);
  });
  it("grades sets with per-correct plus perfect bonus", () => {
    expect(xpForGradedSet(10, 10, 5, 5)).toBe(60);
    expect(xpForGradedSet(10, 10, 3, 5)).toBe(30);
    expect(xpForGradedSet(5, 10, 0, 0)).toBe(0);
  });
  it("maps scores to bands top-down", () => {
    expect(xpFromBands(XP_RULES.bands.productive, 0)).toBe(8);
    expect(xpFromBands(XP_RULES.bands.productive, 39)).toBe(8);
    expect(xpFromBands(XP_RULES.bands.productive, 40)).toBe(12);
    expect(xpFromBands(XP_RULES.bands.productive, 70)).toBe(17);
    expect(xpFromBands(XP_RULES.bands.productive, 85)).toBe(22);
    expect(xpFromBands(XP_RULES.bands.productive, 100)).toBe(22);
  });
});

describe("skill scores", () => {
  it("aggregates per-skill accuracy and ignores unknown skills", () => {
    const skills = computeSkillScores([
      { skill: "grammar", score: 8, total: 10 },
      { skill: "grammar", score: 5, total: 10 },
      { skill: "reading", score: 3, total: 5 },
      { skill: "nope", score: 10, total: 10 },
      { skill: "listening", score: 0, total: 0 },
    ]);
    const grammar = skills.find((s) => s.skill === "grammar")!;
    expect(grammar.attempts).toBe(2);
    expect(grammar.accuracyPct).toBe(65);
    const reading = skills.find((s) => s.skill === "reading")!;
    expect(reading.accuracyPct).toBe(60);
    const listening = skills.find((s) => s.skill === "listening")!;
    expect(listening.accuracyPct).toBeNull();
    expect(listening.attempts).toBe(0);
  });
  it("seeds vocabulary from dictionary mastery", () => {
    const skills = computeSkillScores([], { avg: 42, count: 7 });
    const vocab = skills.find((s) => s.skill === "vocabulary")!;
    expect(vocab.accuracyPct).toBe(42);
    expect(vocab.attempts).toBe(7);
    expect(vocab.note).toBe("avg mastery");
  });
  it("covers every known skill in a stable order", () => {
    const skills = computeSkillScores([]);
    expect(skills.map((s) => s.skill)).toEqual(
      ["vocabulary", "grammar", "reading", "listening", "pronunciation", "dictation", "spelling", "writing", "speaking", "read-aloud"]
    );
  });
});

describe("spellingAccuracy + masteryStats", () => {
  it("handles empty attempts", () => {
    expect(spellingAccuracy([])).toEqual({ attempts: 0, accuracyPct: null });
  });
  it("computes boolean accuracy", () => {
    expect(spellingAccuracy([{ correct: true }, { correct: true }, { correct: false }, { correct: true }]))
      .toEqual({ attempts: 4, accuracyPct: 75 });
  });
  it("distributes mastery into bands with an average", () => {
    const m = masteryStats([{ mastery: 0 }, { mastery: 30 }, { mastery: 70 }, { mastery: 95 }]);
    expect(m.count).toBe(4);
    expect(m.avg).toBe(49);
    expect(m.distribution).toEqual({ fresh: 1, learning: 1, good: 1, mastered: 1 });
  });
  it("returns null average when empty", () => {
    expect(masteryStats([]).avg).toBeNull();
  });
});

describe("findWeakAreas", () => {
  const skills = computeSkillScores([
    { skill: "grammar", score: 4, total: 10 },
    { skill: "reading", score: 9, total: 10 },
  ]);
  it("ranks low accuracy first", () => {
    const weak = findWeakAreas(skills);
    expect(weak[0].skill).toBe("grammar");
    expect(weak[0].reason).toContain("40%");
  });
  it("appends unstarted skills after weak ones and caps at 3", () => {
    const weak = findWeakAreas(skills);
    expect(weak).toHaveLength(3);
    expect(weak[1].reason).toBe("Not started yet");
  });
  it("returns empty when everything is strong", () => {
    const strong = computeSkillScores([
      { skill: "grammar", score: 9, total: 10 },
      { skill: "reading", score: 10, total: 10 },
      { skill: "listening", score: 8, total: 10 },
      { skill: "spelling", score: 9, total: 10 },
      { skill: "writing", score: 90, total: 100 },
      { skill: "speaking", score: 85, total: 100 },
      { skill: "pronunciation", score: 80, total: 100 },
      { skill: "read-aloud", score: 95, total: 100 },
      { skill: "dictation", score: 8, total: 10 },
    ], { avg: 90, count: 5 });
    expect(findWeakAreas(strong)).toEqual([]);
  });
});
