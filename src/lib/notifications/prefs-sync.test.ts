import { describe, it, expect } from "vitest";
import { inQuietHours, localMinutes, parsePrefs, pastReminderTime } from "@/lib/notifications/prefs";
import { planSync } from "@/lib/notifications/sync";
import type { NotificationDescriptor } from "@/lib/notifications/types";

describe("notification prefs", () => {
  it("merges stored prefs over safe defaults", () => {
    const p = parsePrefs({ reminderTime: "20:30", dailyMax: 99, categories: { goal: false }, enabled: false });
    expect(p.reminderTime).toBe("20:30");
    expect(p.dailyMax).toBe(5); // out of range -> safe default
    expect(p.categories.goal).toBe(false);
    expect(p.categories.streak).toBe(true);
    expect(p.enabled).toBe(false);
  });

  it("rejects garbage times and counts", () => {
    const p = parsePrefs({ reminderTime: "25:99", quietFrom: "x", dailyMax: 0 });
    expect(p.reminderTime).toBe("19:00");
    expect(p.quietFrom).toBe("22:00");
    expect(p.dailyMax).toBe(5);
    expect(parsePrefs(null).enabled).toBe(true);
  });

  it("detects quiet windows incl. overnight wrap", () => {
    const at = (iso: string) => new Date(iso);
    // 23:30 UTC == 23:30 in UTC zone
    expect(inQuietHours(at("2026-10-13T23:30:00Z"), "UTC", "22:00", "07:00")).toBe(true);
    expect(inQuietHours(at("2026-10-13T12:00:00Z"), "UTC", "22:00", "07:00")).toBe(false);
    expect(inQuietHours(at("2026-10-13T06:59:00Z"), "UTC", "22:00", "07:00")).toBe(true);
    expect(inQuietHours(at("2026-10-13T12:00:00Z"), "UTC", "13:00", "14:00")).toBe(false);
    expect(inQuietHours(at("2026-10-13T13:30:00Z"), "UTC", "13:00", "14:00")).toBe(true);
    expect(inQuietHours(at("2026-10-13T12:00:00Z"), "UTC", "00:00", "00:00")).toBe(false);
    expect(inQuietHours(at("2026-10-13T12:00:00Z"), "Nope/Zone", "22:00", "07:00")).toBe(false);
  });

  it("resolves learner-local minutes and reminder time", () => {
    // 16:00 UTC == 21:00 in Asia/Almaty (UTC+6, no DST)
    expect(localMinutes(new Date("2026-10-13T16:00:00Z"), "Asia/Almaty")).toBe(21 * 60);
    expect(pastReminderTime(new Date("2026-10-13T16:00:00Z"), "Asia/Almaty", "19:00")).toBe(true);
    expect(pastReminderTime(new Date("2026-10-13T10:00:00Z"), "Asia/Almaty", "19:00")).toBe(false);
  });
});

function desc(key: string, priority: "low" | "normal" | "high" = "normal"): NotificationDescriptor {
  return { key, category: "learning", priority, titleKey: "t", bodyKey: "b", vars: {}, href: "/dashboard", expiresAt: null };
}

describe("sync reconcile", () => {
  it("inserts missing, never duplicates", () => {
    const plan = planSync([desc("a"), desc("b")], new Map([["a", { key: "a", dismissedAt: null, resolvedAt: null }]]), {
      createdToday: 0,
      dailyMax: 5,
    });
    expect(plan.insert.map((d) => d.key)).toEqual(["b"]);
    expect(plan.rearm).toEqual([]);
    expect(plan.resolve).toEqual([]);
  });

  it("never resurrects dismissed rows, but re-arms resolved ones", () => {
    const plan = planSync(
      [desc("gone-forever"), desc("back")],
      new Map([
        ["gone-forever", { key: "gone-forever", dismissedAt: "2026-10-12", resolvedAt: null }],
        ["back", { key: "back", dismissedAt: null, resolvedAt: "2026-10-12" }],
      ]),
      { createdToday: 0, dailyMax: 5 }
    );
    expect(plan.insert).toEqual([]);
    expect(plan.rearm).toEqual(["back"]);
  });

  it("resolves cleared conditions, keeps dismissed out of it", () => {
    const plan = planSync(
      [desc("still")],
      new Map([
        ["still", { key: "still", dismissedAt: null, resolvedAt: null }],
        ["cleared", { key: "cleared", dismissedAt: null, resolvedAt: null }],
        ["buried", { key: "buried", dismissedAt: "x", resolvedAt: null }],
      ]),
      { createdToday: 0, dailyMax: 5 }
    );
    expect(plan.resolve).toEqual(["cleared"]);
  });

  it("enforces the daily cap by priority", () => {
    const plan = planSync([desc("low1", "low"), desc("high1", "high"), desc("low2", "low")], new Map(), {
      createdToday: 4,
      dailyMax: 5,
    });
    expect(plan.insert.map((d) => d.key)).toEqual(["high1"]);
  });
});
