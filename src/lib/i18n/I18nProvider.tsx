"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_META,
  LOCALE_STORAGE_KEY,
  isLocale,
  resolveLocale,
} from "./config";
import type { Locale } from "./config";
import { translate } from "./dictionaries";

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale, opts?: { persist?: boolean }) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode — cookie still works */
  }
  try {
    // 1-year cookie so Server Components render the right language on navigation.
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    /* noop */
  }
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    isLocale(initialLocale) ? initialLocale : DEFAULT_LOCALE
  );

  // On mount, apply local preference / browser language if the server
  // had nothing better (priority: user setting → local → browser → en).
  useEffect(() => {
    if (isLocale(initialLocale) && initialLocale !== DEFAULT_LOCALE) return;
    const stored = readStoredLocale();
    const resolved = resolveLocale({
      stored,
      acceptLanguage: typeof navigator !== "undefined" ? navigator.language : null,
    });
    if (resolved !== locale) setLocaleState(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> correct for screen readers and SEO.
  useEffect(() => {
    try {
      document.documentElement.lang = LOCALE_META[locale].htmlLang;
    } catch {
      /* noop */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale, opts?: { persist?: boolean }) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    if (opts?.persist === false) return;
    writeStoredLocale(next);
    // Best-effort sync to the Supabase profile (logged-in users).
    fetch("/api/profile/language", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferredLanguage: next }),
    }).catch(() => {});
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/** Shorthand: const { t } = useTranslation(); */
export function useTranslation() {
  const { t, locale, setLocale } = useI18n();
  return { t, locale, setLocale };
}
