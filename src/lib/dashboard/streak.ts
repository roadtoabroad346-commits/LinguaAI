/** Phase 2 — streak helpers. Pure + deterministic (no AI, no I/O). */

export const DEFAULT_TIMEZONE = "UTC";

/** True when `tz` is a real IANA timezone (falls back to UTC otherwise). */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function safeTimezone(tz: string | null | undefined): string {
  return tz && isValidTimezone(tz) ? tz : DEFAULT_TIMEZONE;
}

/** Calendar date (YYYY-MM-DD) of `now` in the given IANA timezone. */
export function dateKeyInTimezone(now: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimezone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Minutes that `tz` is ahead of UTC at `date` (handles DST). */
function tzOffsetMinutes(tz: string, date: Date): number {
  const zone = safeTimezone(tz);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const wallMs = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((wallMs - date.getTime()) / 60_000);
}

/**
 * UTC instant of midnight starting the user's current day in `tz`.
 * Used as the `xp_events.created_at` lower bound for "XP today".
 */
export function startOfDayUtc(now: Date, tz: string): Date {
  const zone = safeTimezone(tz);
  const key = dateKeyInTimezone(now, zone);
  const offset = tzOffsetMinutes(zone, new Date(`${key}T12:00:00Z`));
  return new Date(Date.parse(`${key}T00:00:00Z`) - offset * 60_000);
}

export function toDateKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

/** Today in the learner's timezone (defaults to UTC). All streak/challenge dates must use this. */
export function todayKeyTz(now: Date, tz: string | null | undefined): string {
  return dateKeyInTimezone(now, tz ?? DEFAULT_TIMEZONE);
}

/** Days between two YYYY-MM-DD keys (UTC). */
export function dayDiff(aKey: string, bKey: string): number {
  const ms = Date.parse(`${bKey}T00:00:00Z`) - Date.parse(`${aKey}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Count consecutive active days ending today (or yesterday — streak still alive).
 * `activeKeys` are unique YYYY-MM-DD strings.
 */
export function computeStreak(activeKeys: string[], now = new Date()): number {
  if (activeKeys.length === 0) return 0;
  const set = new Set(activeKeys);
  const today = todayKey(now);
  // Streak anchor: today if active, else yesterday (grace day). Otherwise 0.
  const yesterday = toDateKey(new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000));
  let cursor = set.has(today) ? today : set.has(yesterday) ? yesterday : null;
  if (!cursor) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = toDateKey(new Date(Date.parse(`${cursor}T00:00:00Z`) - 86_400_000));
  }
  return streak;
}

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDate: string | null;
}

/** Next streak counters after activity on `today`. Pure — caller persists. */
export function nextStreakState(prev: StreakState, today: string): StreakState {
  if (prev.lastActiveDate === today) return prev;
  const last = prev.lastActiveDate;
  const consecutive = last !== null && dayDiff(last, today) === 1;
  const current = last === null ? 1 : consecutive ? prev.current + 1 : 1;
  return {
    current,
    longest: Math.max(prev.longest, current),
    lastActiveDate: today,
  };
}
