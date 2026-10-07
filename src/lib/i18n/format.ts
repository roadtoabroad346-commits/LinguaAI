import type { Locale } from "./config";
import { LOCALE_META } from "./config";

/** Locale-aware formatting: dates, numbers, XP, plurals. */

function intl(locale: Locale): string {
  return LOCALE_META[locale].intl;
}

export function formatDate(locale: Locale, value: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intl(locale), opts ?? { dateStyle: "medium" }).format(d);
}

export function formatDateTime(locale: Locale, value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(intl(locale), { dateStyle: "medium", timeStyle: "short" }).format(d);
}

export function formatNumber(locale: Locale, value: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(intl(locale), opts).format(value);
}

export function formatPercent(locale: Locale, value: number): string {
  return new Intl.NumberFormat(intl(locale), { style: "percent", maximumFractionDigits: 0 }).format(value);
}

export function formatXP(locale: Locale, value: number): string {
  return `${new Intl.NumberFormat(intl(locale)).format(value)} XP`;
}

/** Format a YYYY-MM-DD challenge key in the user's locale. */
export function formatChallengeDate(locale: Locale, dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return dateKey;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return new Intl.DateTimeFormat(intl(locale), { timeZone: "UTC", dateStyle: "medium" }).format(d);
}

export function pluralCategory(locale: Locale, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}
