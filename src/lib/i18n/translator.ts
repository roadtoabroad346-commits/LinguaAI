import type { Locale } from "./config";

export type RuntimeDictionary = Record<string, unknown>;
type PluralForms = { one?: string; few?: string; many?: string; other?: string };

function lookup(obj: unknown, path: string): unknown {
  let current = obj;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function humanize(key: string): string {
  const last = key.split(".").pop() ?? key;
  const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : match
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

export function translateDictionary(
  dictionary: RuntimeDictionary,
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>
): string {
  const raw = lookup(dictionary, key);
  if (raw === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[i18n] missing key "${key}" (locale "${locale}")`);
    }
    return humanize(key);
  }
  if (typeof raw === "string") return interpolate(raw, vars);
  const count = typeof vars?.count === "number" ? vars.count : 1;
  const picked = pickPlural(raw as PluralForms, locale, count);
  return picked ? interpolate(picked, { ...vars, count }) : humanize(key);
}
