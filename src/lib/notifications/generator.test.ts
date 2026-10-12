import { describe, it, expect } from "vitest";
import { generateNotifications, sortDescriptors, type NotifSignals } from "@/lib/notifications/generator";
import { NOTIF_HREFS } from "@/lib/notifications/types";

function base(over: Partial<NotifSignals> = {}): NotifSignals {
  return {
    today: "2026-10-13",
    weekKey: "2026-W42",
    onboardingCompleted: true,
    level: "B1",
    placementCompleted: true,
    dailyGoalXp: 30,
    xpToday: 30,
    streakCurrent: 5,
    totalXp: 500,
    dictCount: 20,
    dueCount: 0,
    challengeDone: true,
    weakAreas: [],
    weekXp: 120,
    idleDays: 0,
    nudgeDue: true,
    ...over,
  };
}

describe("notification generator", () => {
  it("gates everything behind onboarding", () => {
    const out = generateNotifications(base({ onboardingCompleted: false }));
    expect(out.map((d) => d.key)).toEqual(["onboarding"]);
    expect(out[0].href).toBe("/onboarding");
  });

  it("asks for placement when level is missing", () => {
    const out = generateNotifications(base({ level: null, placementCompleted: false }));
    expect(out.some((d) => d.key === "placement" && d.href === "/placement")).toBe(true);
  });

  it("nudges the first session for empty accounts", () => {
    const out = generateNotifications(base({ totalXp: 0, dictCount: 0 }));
    expect(out.some((d) => d.key === "first-session")).toBe(true);
  });

  it("flags due reviews with the count", () => {
    const out = generateNotifications(base({ dueCount: 10 }));
    const d = out.find((x) => x.key === "review-due");
    expect(d?.vars.count).toBe(10);
    expect(d?.href).toBe("/flashcards");
    expect(d?.priority).toBe("high");
  });

  it("creates daily goal + streak + challenge keys scoped to today", () => {
    const out = generateNotifications(base({ xpToday: 0, challengeDone: false }));
    const keys = out.map((d) => d.key);
    expect(keys).toContain("goal:2026-10-13");
    expect(keys).toContain("streak:2026-10-13");
    expect(keys).toContain("challenge:2026-10-13");
  });

  it("raises goal priority after the reminder time", () => {
    const early = generateNotifications(base({ xpToday: 5, nudgeDue: false }));
    const late = generateNotifications(base({ xpToday: 5, nudgeDue: true }));
    expect(early.find((d) => d.key.startsWith("goal:"))?.priority).toBe("normal");
    expect(late.find((d) => d.key.startsWith("goal:"))?.priority).toBe("high");
  });

  it("fires one-shot milestones for exact tiers only", () => {
    const out = generateNotifications(base({ streakCurrent: 7, dictCount: 120 }));
    expect(out.some((d) => d.key === "ms-streak:7")).toBe(true);
    expect(out.some((d) => d.key === "ms-words:100")).toBe(true);
    expect(out.some((d) => d.key === "ms-words:50")).toBe(false);
    const calm = generateNotifications(base({ streakCurrent: 8, dictCount: 15 }));
    expect(calm.some((d) => d.key.startsWith("ms-streak"))).toBe(false);
    expect(calm.some((d) => d.key === "ms-words:10")).toBe(true);
  });

  it("emits at most two weak-skill nudges with valid links", () => {
    const out = generateNotifications(
      base({
        weakAreas: [
          { skill: "grammar", label: "Grammar", href: "/grammar" },
          { skill: "writing", label: "Writing", href: "/writing" },
          { skill: "reading", label: "Reading", href: "/reading" },
        ],
      })
    );
    expect(out.filter((d) => d.key.startsWith("weak:")).map((d) => d.key)).toEqual(["weak:grammar", "weak:writing"]);
  });

  it("nudges idle learners and summarizes the week", () => {
    const out = generateNotifications(base({ idleDays: 4 }));
    expect(out.some((d) => d.key === "idle:2026-10-13")).toBe(true);
    expect(out.some((d) => d.key === "weekly:2026-W42")).toBe(true);
    expect(generateNotifications(base({ idleDays: 1 })).some((d) => d.key.startsWith("idle:"))).toBe(false);
    expect(generateNotifications(base({ weekXp: 0 })).some((d) => d.key.startsWith("weekly:"))).toBe(false);
  });

  it("orders high priority first, deterministically", () => {
    const ordered = sortDescriptors([
      { key: "b", priority: "low" },
      { key: "a", priority: "high" },
      { key: "c", priority: "normal" },
    ]);
    expect(ordered.map((o) => o.key)).toEqual(["a", "c", "b"]);
  });

  it("every generated deep link is a real app route", () => {
    const allow = new Set<string>(NOTIF_HREFS);
    const allowArr = Array.from(allow);
    const signals: NotifSignals[] = [
      base(),
      base({ onboardingCompleted: false }),
      base({ level: null, placementCompleted: false, totalXp: 0, dictCount: 0, dueCount: 3, xpToday: 0, challengeDone: false, idleDays: 9, weakAreas: [{ skill: "grammar", label: "Grammar", href: "/grammar" }] }),
    ];
    for (const s of signals) {
      for (const d of generateNotifications(s)) {
        const ok = allow.has(d.href) || allowArr.some((v) => d.href.startsWith(v + "/"));
        expect(`${d.key} -> ${d.href}`).toSatisfy(() => ok);
      }
    }
  });
});
