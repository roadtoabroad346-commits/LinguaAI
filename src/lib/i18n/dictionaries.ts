import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import kk from "@/locales/kk.json";
import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";

export type Dictionary = typeof en;
export type TranslationKey = string;

const DICTS: Record<Locale, unknown> = { en, ru, kk };

export function getDictionary(locale: Locale): Dictionary {
  return DICTS[locale] as Dictionary;
}

export function getEnglishDictionary(): Dictionary {
  return en;
}

type PluralForms = { one?: string; few?: string; many?: string; other?: string };
type DictValue = string | PluralForms;

function lookup(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function humanize(key: string): string {
  const last = key.split(".").pop() ?? key;
  const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : m
  );
}

function pickPlural(forms: PluralForms, locale: Locale, count: number): string | undefined {
  try {
    const rule = new Intl.PluralRules(locale).select(count);
    return forms[rule as keyof PluralForms] ?? forms.other ?? forms.many ?? forms.one;
  } catch {
    return forms.other ?? forms.one;
  }
}

/**
 * Translate a dotted key with fallback: current locale → English → humanized key.
 * Missing keys are warned once (dev) so they get fixed without ever showing
 * raw keys like "dashboard.continueLearning" to users.
 */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const count = vars?.count;
  const raw =
    lookup(DICTS[locale], key) ?? lookup(DICTS[DEFAULT_LOCALE], key);

  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] missing key "${key}" (locale "${locale}")`);
    }
    return humanize(key);
  }

  if (typeof raw === "string") return interpolate(raw, vars);

  // Plural object { one/few/many/other }.
  const forms = raw as PluralForms;
  const n = typeof count === "number" ? count : 1;
  const picked = pickPlural(forms, locale, n);
  if (!picked) return humanize(key);
  return interpolate(picked, { ...vars, count: n });
}

/** Collect all dotted leaf keys of a dictionary (for parity tests). */
export function collectKeys(obj: unknown, prefix = ""): string[] {
  if (typeof obj === "string") return [prefix];
  if (obj === null || typeof obj !== "object") return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(path);
    else out.push(...collectKeys(v, path));
  }
  return out;
}

export type { Locale };
