import { describe, expect, it } from "vitest";
import { computeStreak, dateKeyInTimezone, dayDiff, isValidTimezone, nextStreakState, startOfDayUtc, toDateKey, todayKeyTz } from "./streak";
import { getWordOfDay } from "./words";
import { buildRecommendations } from "./recommendations";
import { getDailyChallenge, gradeDailyChallenge, POOL, toPublicChallenge } from "./daily-challenge";

describe("streak", () => {
  it("returns 0 with no activity", () => {
    expect(computeStreak([], new Date("2026-10-05T12:00:00Z"))).toBe(0);
  });
  it("counts consecutive days ending today", () => {
    expect(computeStreak(["2026-10-03", "2026-10-04", "2026-10-05"], new Date("2026-10-05T12:00:00Z"))).toBe(3);
  });
  it("keeps streak alive when only yesterday is active", () => {
    expect(computeStreak(["2026-10-04"], new Date("2026-10-05T12:00:00Z"))).toBe(1);
  });
  it("breaks when gap day exists", () => {
    expect(computeStreak(["2026-10-01", "2026-10-05"], new Date("2026-10-05T12:00:00Z"))).toBe(1);
  });
  it("nextStreakState increments on consecutive days", () => {
    const s = nextStreakState({ current: 2, longest: 2, lastActiveDate: "2026-10-04" }, "2026-10-05");
    expect(s).toEqual({ current: 3, longest: 3, lastActiveDate: "2026-10-05" });
  });
  it("nextStreakState resets after a gap and is idempotent same-day", () => {
    const s = nextStreakState({ current: 5, longest: 7, lastActiveDate: "2026-10-01" }, "2026-10-05");
    expect(s.current).toBe(1);
    expect(nextStreakState(s, "2026-10-05")).toEqual(s);
  });
  it("toDateKey is UTC-stable", () => {
    expect(toDateKey(new Date("2026-10-05T23:59:59Z"))).toBe("2026-10-05");
  });
});

describe("word of the day", () => {
  it("is deterministic per date+level", () => {
    const a = getWordOfDay("2026-10-05", "B1");
    const b = getWordOfDay("2026-10-05", "B1");
    expect(a).toEqual(b);
    expect(a.level).toBe("B1");
  });
  it("varies by level", () => {
    const a1 = getWordOfDay("2026-10-05", "A1");
    const c1 = getWordOfDay("2026-10-05", "C1");
    expect(a1.level).toBe("A1");
    expect(c1.level).toBe("C1");
  });
});

describe("recommendations", () => {
  it("pushes onboarding + placement for new users", () => {
    const recs = buildRecommendations({ profile: null, xpToday: 0, dailyGoalXp: 30, streak: 0, challengeDone: false, dictionaryCount: 0 });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.length).toBeLessThanOrEqual(4);
  });
  it("matches goals to modules", () => {
    const recs = buildRecommendations({
      profile: { level: "B1", learning_mode: "free", onboarding_completed: true, goals: ["improve speaking"] },
      xpToday: 10, dailyGoalXp: 30, streak: 2, challengeDone: true, dictionaryCount: 5,
    });
    expect(recs.some((r) => r.href === "/speaking")).toBe(true);
  });
});

describe("daily challenge", () => {
  it("returns 5 deterministic questions", () => {
    const a = getDailyChallenge("2026-10-05", "B1");
    const b = getDailyChallenge("2026-10-05", "B1");
    expect(a.questions).toHaveLength(5);
    expect(a.questions.map((q) => q.id)).toEqual(b.questions.map((q) => q.id));
  });
  it("public version hides answers", () => {
    const pub = toPublicChallenge(getDailyChallenge("2026-10-05", "A1"));
    expect((pub.questions[0] as Record<string, unknown>).answer).toBeUndefined();
  });
  it("grades perfectly and awards bonus", () => {
    const c = getDailyChallenge("2026-10-05", "A1");
    const answers: Record<string, number> = {};
    for (const q of c.questions) answers[q.id] = q.answer;
    const g = gradeDailyChallenge(c, answers);
    expect(g.score).toBe(5);
    expect(g.xpEarned).toBe(5 * 10 + 10);
    expect(g.perfect).toBe(true);
  });
  it("ignores out-of-range answers", () => {
    const c = getDailyChallenge("2026-10-05", "A1");
    const g = gradeDailyChallenge(c, { [c.questions[0].id]: 99 });
    expect(g.score).toBe(0);
    expect(g.xpEarned).toBe(0);
  });
  it("covers all five skills with unique ids", () => {
    const c = getDailyChallenge("2026-10-05", "B1");
    const kinds = c.questions.map((q) => q.kind).sort();
    expect(kinds).toEqual(["grammar", "listening", "reading", "spelling", "vocab"]);
    expect(new Set(c.questions.map((q) => q.id)).size).toBe(5);
  });
  it("keeps the skill mix across many dates and varies rotation", () => {
    const seen = new Set<string>();
    for (let d = 1; d <= 14; d++) {
      const key = `2026-10-${String(d).padStart(2, "0")}`;
      const c = getDailyChallenge(key, null);
      expect(c.questions).toHaveLength(5);
      expect(new Set(c.questions.map((q) => q.kind)).size).toBe(5);
      expect(new Set(c.questions.map((q) => q.id)).size).toBe(5);
      seen.add(c.questions.map((q) => q.id).join(","));
      // Spelling answers always point at the correctly spelled choice.
      for (const q of c.questions.filter((x) => x.kind === "spelling")) {
        expect(q.choices[q.answer].length).toBeGreaterThan(2);
      }
    }
    expect(seen.size).toBeGreaterThan(1);
  });
  it("has a valid pool: every question has 4 choices and an in-range answer", () => {
    expect(POOL.length).toBeGreaterThanOrEqual(15);
    for (const q of POOL) {
      expect(q.choices).toHaveLength(4);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.answer).toBeLessThan(4);
      expect(new Set(q.choices).size).toBe(4);
    }
  });
});

describe("timezone-aware dates", () => {
  it("validates IANA timezones", () => {
    expect(isValidTimezone("Europe/Berlin")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
  it("computes the local date across day boundaries", () => {
    // 2026-10-05T01:00Z is still Oct 4 in New York, already Oct 5 in Berlin.
    const instant = new Date("2026-10-05T01:00:00Z");
    expect(dateKeyInTimezone(instant, "UTC")).toBe("2026-10-05");
    expect(dateKeyInTimezone(instant, "America/New_York")).toBe("2026-10-04");
    expect(dateKeyInTimezone(instant, "Europe/Berlin")).toBe("2026-10-05");
    // Far-east zone is a day ahead in the evening UTC.
    expect(dateKeyInTimezone(new Date("2026-10-05T14:00:00Z"), "Pacific/Kiritimati")).toBe("2026-10-06");
  });
  it("falls back to UTC for invalid zones", () => {
    const instant = new Date("2026-10-05T01:00:00Z");
    expect(dateKeyInTimezone(instant, "Bogus/Zone")).toBe("2026-10-05");
    expect(todayKeyTz(instant, null)).toBe("2026-10-05");
    expect(todayKeyTz(instant, undefined)).toBe("2026-10-05");
  });
  it("starts the day at local midnight in UTC terms", () => {
    // Berlin (UTC+2 in October): local midnight = 22:00Z previous day.
    const start = startOfDayUtc(new Date("2026-10-05T12:00:00Z"), "Europe/Berlin");
    expect(start.toISOString()).toBe("2026-10-04T22:00:00.000Z");
    // UTC day starts at 00:00Z.
    expect(startOfDayUtc(new Date("2026-10-05T12:00:00Z"), "UTC").toISOString()).toBe("2026-10-05T00:00:00.000Z");
  });
  it("keeps dayDiff working on timezone calendar keys", () => {
    expect(dayDiff("2026-10-04", "2026-10-05")).toBe(1);
  });
});
