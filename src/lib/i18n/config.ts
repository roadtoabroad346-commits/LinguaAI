/** i18n configuration — LinguaAI interface languages: Kazakh, Russian, English. */

export const LOCALES = ["kk", "ru", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie + localStorage key for the local (unauthenticated) preference. */
export const LOCALE_COOKIE = "linguaai_locale";
export const LOCALE_STORAGE_KEY = "linguaai_locale";

export const LOCALE_META: Record<
  Locale,
  { label: string; shortLabel: string; flag: string; htmlLang: string; intl: string }
> = {
  kk: { label: "Қазақша", shortLabel: "KZ", flag: "🇰🇿", htmlLang: "kk", intl: "kk-KZ" },
  ru: { label: "Русский", shortLabel: "RU", flag: "🇷🇺", htmlLang: "ru", intl: "ru-RU" },
  en: { label: "English", shortLabel: "EN", flag: "🇬🇧", htmlLang: "en", intl: "en-US" },
};

export function isLocale(value: unknown): value is Locale {
  return value === "kk" || value === "ru" || value === "en";
}

/**
 * Resolution priority: user setting → local preference → browser language → English.
 * `stored` is the profile setting or the cookie/local value (already merged upstream).
 */
export function resolveLocale(opts: {
  stored?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(opts.stored)) return opts.stored;
  const al = (opts.acceptLanguage ?? "").toLowerCase();
  // Parse quality-weighted ranges like "kk-KZ,kk;q=0.9,ru;q=0.8,en;q=0.7".
  const ranges = al
    .split(",")
    .map((part) => part.split(";")[0]?.trim())
    .filter(Boolean) as string[];
  for (const range of ranges) {
    const base = range.split("-")[0];
    if (base === "kk") return "kk";
    if (base === "ru") return "ru";
    if (base === "en") return "en";
  }
  return DEFAULT_LOCALE;
}

/** Parse an Accept-Language header value (server helper). */
export function parseAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  return header;
}
