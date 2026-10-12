import { DEFAULT_PREFS, NOTIF_CATEGORIES, type NotifCategory, type NotifPrefs } from "./types";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Merge stored prefs (profiles.preferences.notifs) over safe defaults. */
export function parsePrefs(raw: unknown): NotifPrefs {
  const o = (raw ?? {}) as Partial<Record<string, unknown>>;
  const cats = { ...DEFAULT_PREFS.categories };
  const stored = o.categories as Partial<Record<NotifCategory, unknown>> | undefined;
  if (stored && typeof stored === "object") {
    for (const c of NOTIF_CATEGORIES) {
      if (typeof stored[c] === "boolean") cats[c] = stored[c];
    }
  }
  const time = (v: unknown, fb: string) => (typeof v === "string" && HHMM.test(v) ? v : fb);
  const dailyMax =
    typeof o.dailyMax === "number" && Number.isInteger(o.dailyMax) && o.dailyMax >= 1 && o.dailyMax <= 20
      ? o.dailyMax
      : DEFAULT_PREFS.dailyMax;
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : true,
    categories: cats,
    reminderTime: time(o.reminderTime, DEFAULT_PREFS.reminderTime),
    quietFrom: time(o.quietFrom, DEFAULT_PREFS.quietFrom),
    quietTo: time(o.quietTo, DEFAULT_PREFS.quietTo),
    dailyMax,
  };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Learner-local "HH:MM" for an instant in their timezone (pure, testable). */
export function localMinutes(at: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "NaN");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "NaN");
    if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
    return h * 60 + m;
  } catch {
    return null; // unknown timezone: no quiet-hours suppression
  }
}

/**
 * True inside the quiet window (overnight ranges wrap past midnight).
 * Unknown timezone or equal bounds (00:00-00:00) mean "no quiet hours".
 */
export function inQuietHours(at: Date, timeZone: string, from: string, to: string): boolean {
  const now = localMinutes(at, timeZone);
  if (now === null) return false;
  const f = toMinutes(from);
  const t = toMinutes(to);
  if (f === t) return false;
  if (f < t) return now >= f && now < t;
  return now >= f || now < t;
}

/** True once the preferred nudge time has passed today (learner-local). */
export function pastReminderTime(at: Date, timeZone: string, reminderTime: string): boolean {
  const now = localMinutes(at, timeZone);
  if (now === null) return true;
  return now >= toMinutes(reminderTime);
}
