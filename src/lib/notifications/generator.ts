import type { NotificationDescriptor } from "./types";

/** Everything the generator needs — all derivable from existing tables. */
export interface NotifSignals {
  today: string; // YYYY-MM-DD in learner timezone
  weekKey: string; // e.g. 2026-W42
  onboardingCompleted: boolean;
  level: string | null;
  placementCompleted: boolean;
  dailyGoalXp: number;
  xpToday: number;
  streakCurrent: number;
  totalXp: number;
  dictCount: number;
  dueCount: number;
  challengeDone: boolean;
  /** Top weak areas (skill label + valid href), at most 2 used. */
  weakAreas: Array<{ skill: string; label: string; href: string }>;
  weekXp: number;
  /** Days since last learning activity (null when unknown). */
  idleDays: number | null;
  /** Reminder time already passed today (drives goal-nudge priority). */
  nudgeDue: boolean;
}

const WORD_TIERS = [10, 50, 100, 500];
const STREAK_TIERS = [7, 30, 100, 365];

/**
 * Pure rule engine: live app state -> notification descriptors with stable
 * dedupe keys. No I/O, no timers — fully deterministic and unit-testable.
 * Only real, existing workflows produce notifications; nothing is fabricated.
 */
export function generateNotifications(s: NotifSignals): NotificationDescriptor[] {
  const out: NotificationDescriptor[] = [];
  const dayEnd = `${s.today}T23:59:59Z`;

  if (!s.onboardingCompleted) {
    out.push({
      key: "onboarding",
      category: "onboarding",
      priority: "high",
      titleKey: "notif.onboardingTitle",
      bodyKey: "notif.onboardingBody",
      vars: {},
      href: "/onboarding",
      expiresAt: null,
    });
    return out; // onboarding gates everything else
  }

  if (!s.level && !s.placementCompleted) {
    out.push({
      key: "placement",
      category: "onboarding",
      priority: "high",
      titleKey: "notif.placementTitle",
      bodyKey: "notif.placementBody",
      vars: {},
      href: "/placement",
      expiresAt: null,
    });
  }

  if (s.totalXp === 0 && s.dictCount === 0) {
    out.push({
      key: "first-session",
      category: "learning",
      priority: "normal",
      titleKey: "notif.firstSessionTitle",
      bodyKey: "notif.firstSessionBody",
      vars: {},
      href: "/daily-challenge",
      expiresAt: null,
    });
  }

  if (s.dueCount > 0) {
    out.push({
      key: "review-due",
      category: "review",
      priority: "high",
      titleKey: "notif.reviewDueTitle",
      bodyKey: "notif.reviewDueBody",
      vars: { count: s.dueCount },
      href: "/flashcards",
      expiresAt: null,
    });
  }

  if (s.xpToday < s.dailyGoalXp) {
    out.push({
      key: `goal:${s.today}`,
      category: "goal",
      priority: s.nudgeDue ? "high" : "normal",
      titleKey: "notif.goalTodayTitle",
      bodyKey: "notif.goalTodayBody",
      vars: { done: s.xpToday, goal: s.dailyGoalXp },
      href: "/dashboard",
      expiresAt: dayEnd,
    });
  }

  if (s.streakCurrent > 0 && s.xpToday === 0) {
    out.push({
      key: `streak:${s.today}`,
      category: "streak",
      priority: "high",
      titleKey: "notif.streakRiskTitle",
      bodyKey: "notif.streakRiskBody",
      vars: { days: s.streakCurrent },
      href: "/daily-challenge",
      expiresAt: dayEnd,
    });
  }

  if (!s.challengeDone) {
    out.push({
      key: `challenge:${s.today}`,
      category: "challenge",
      priority: "normal",
      titleKey: "notif.challengeTodoTitle",
      bodyKey: "notif.challengeTodoBody",
      vars: {},
      href: "/daily-challenge",
      expiresAt: dayEnd,
    });
  }

  for (const w of s.weakAreas.slice(0, 2)) {
    out.push({
      key: `weak:${w.skill}`,
      category: "skills",
      priority: "low",
      titleKey: "notif.weakSkillTitle",
      bodyKey: "notif.weakSkillBody",
      vars: { skill: w.label },
      href: w.href,
      expiresAt: null,
    });
  }

  if (STREAK_TIERS.includes(s.streakCurrent)) {
    out.push({
      key: `ms-streak:${s.streakCurrent}`,
      category: "milestone",
      priority: "normal",
      titleKey: "notif.streakMilestoneTitle",
      bodyKey: "notif.streakMilestoneBody",
      vars: { days: s.streakCurrent },
      href: "/progress",
      expiresAt: null,
    });
  }

  const wordTier = [...WORD_TIERS].reverse().find((t) => s.dictCount >= t);
  if (wordTier !== undefined) {
    out.push({
      key: `ms-words:${wordTier}`,
      category: "milestone",
      priority: "normal",
      titleKey: "notif.wordsMilestoneTitle",
      bodyKey: "notif.wordsMilestoneBody",
      vars: { count: wordTier },
      href: "/dictionary",
      expiresAt: null,
    });
  }

  if (s.weekXp > 0) {
    out.push({
      key: `weekly:${s.weekKey}`,
      category: "weekly",
      priority: "low",
      titleKey: "notif.weeklyTitle",
      bodyKey: "notif.weeklyBody",
      vars: { xp: s.weekXp },
      href: "/progress",
      expiresAt: null,
    });
  }

  if (s.idleDays !== null && s.idleDays >= 3) {
    out.push({
      key: `idle:${s.today}`,
      category: "learning",
      priority: "low",
      titleKey: "notif.idleTitle",
      bodyKey: "notif.idleBody",
      vars: { days: s.idleDays },
      href: "/dashboard",
      expiresAt: dayEnd,
    });
  }

  return out;
}

/** Priority rank for deterministic ordering (high first, then stable by key). */
export function sortDescriptors<T extends { priority: string; key: string }>(items: T[]): T[] {
  const rank = (p: string) => (p === "high" ? 0 : p === "normal" ? 1 : 2);
  return [...items].sort((a, b) => rank(a.priority) - rank(b.priority) || (a.key < b.key ? -1 : 1));
}
