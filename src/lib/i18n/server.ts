import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, resolveLocale } from "./config";
import type { Locale } from "./config";
import { translate } from "./dictionaries";

/** Read the persisted locale cookie (may be absent for new/logged-out visitors). */
export function getRequestLocale(): Locale {
  try {
    const store = cookies();
    const raw = store.get(LOCALE_COOKIE)?.value;
    if (isLocale(raw)) return raw;
  } catch {
    /* cookies() unavailable (e.g. client) — fall through */
  }
  try {
    const h = headers();
    const al = h.get("accept-language");
    return resolveLocale({ acceptLanguage: al });
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Server-side translator for Server Components / Route Handlers.
 * Same fallback chain as the client: locale → English → humanized key.
 */
export function getServerT(locale: Locale) {
  return (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);
}

/**
 * Effective locale for Server Components: profile setting first
 * (when signed in), then the locale cookie, then Accept-Language.
 * Priority: user setting → local preference → browser language → English.
 */
export async function getEffectiveLocale(): Promise<Locale> {
  const cookieLocale = getRequestLocale();
  try {
    const { getSessionProfile } = await import("@/lib/auth/session");
    const profile = await getSessionProfile();
    const pref = (profile as { preferred_language?: unknown } | null)?.preferred_language;
    if (isLocale(pref)) return pref;
  } catch {
    /* signed out or unconfigured — fall through to cookie/browser */
  }
  return cookieLocale;
}
