/** Notification center types: DB rows, generator descriptors, preferences. */

export const NOTIF_CATEGORIES = [
  "onboarding",
  "learning",
  "review",
  "goal",
  "streak",
  "challenge",
  "skills",
  "milestone",
  "weekly",
  "system",
] as const;
export type NotifCategory = (typeof NOTIF_CATEGORIES)[number];

export const NOTIF_PRIORITIES = ["low", "normal", "high"] as const;
export type NotifPriority = (typeof NOTIF_PRIORITIES)[number];

/** Valid in-app destinations for notification deep links (no dead links). */
export const NOTIF_HREFS = [
  "/dashboard",
  "/onboarding",
  "/placement",
  "/flashcards",
  "/daily-challenge",
  "/grammar",
  "/reading",
  "/listening",
  "/speaking",
  "/writing",
  "/spelling",
  "/progress",
  "/smart-path",
  "/profile",
  "/vocabulary",
  "/dictionary",
] as const;

export interface NotificationRow {
  id: string;
  user_id: string;
  dedupe_key: string;
  category: NotifCategory;
  priority: NotifPriority;
  title_key: string;
  body_key: string;
  vars: Record<string, string | number>;
  href: string;
  read_at: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  resolved_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/** Pure generator output: what SHOULD exist right now (before prefs/sync). */
export interface NotificationDescriptor {
  key: string;
  category: NotifCategory;
  priority: NotifPriority;
  titleKey: string;
  bodyKey: string;
  vars: Record<string, string | number>;
  href: string;
  /** Auto-drop after this date (e.g. daily keys expire next day). */
  expiresAt: string | null;
}

export interface NotifPrefs {
  enabled: boolean;
  categories: Record<NotifCategory, boolean>;
  /** Preferred nudge time "HH:MM" (learner-local). */
  reminderTime: string;
  quietFrom: string;
  quietTo: string;
  /** Max NEW notifications per day (anti-spam cap). */
  dailyMax: number;
}

export const DEFAULT_PREFS: NotifPrefs = {
  enabled: true,
  categories: {
    onboarding: true,
    learning: true,
    review: true,
    goal: true,
    streak: true,
    challenge: true,
    skills: true,
    milestone: true,
    weekly: true,
    system: true,
  },
  reminderTime: "19:00",
  quietFrom: "22:00",
  quietTo: "07:00",
  dailyMax: 5,
};
