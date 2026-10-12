import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, isLocale, resolveLocale } from "@/lib/i18n/config";
import { collectKeys, getDictionary, translate } from "@/lib/i18n/dictionaries";
import { formatDate, formatNumber, formatXP, pluralCategory } from "@/lib/i18n/format";
import { buildTeacherSystemPrompt, fallbackTeacherReply } from "@/lib/teacher/teacher";

describe("locale resolution (user → local → browser → en)", () => {
  it("prefers the stored setting", () => {
    expect(resolveLocale({ stored: "kk", acceptLanguage: "ru-RU,en;q=0.8" })).toBe("kk");
    expect(resolveLocale({ stored: "ru", acceptLanguage: "kk-KZ" })).toBe("ru");
  });
  it("detects kk/ru from Accept-Language", () => {
    expect(resolveLocale({ acceptLanguage: "kk-KZ,kk;q=0.9,ru;q=0.8" })).toBe("kk");
    expect(resolveLocale({ acceptLanguage: "ru-RU,ru;q=0.9,en;q=0.8" })).toBe("ru");
    expect(resolveLocale({ acceptLanguage: "en-US,en;q=0.9" })).toBe("en");
  });
  it("falls back to English", () => {
    expect(resolveLocale({})).toBe("en");
    expect(resolveLocale({ acceptLanguage: "de-DE,de;q=0.9" })).toBe("en");
    expect(resolveLocale({ stored: "fr" })).toBe("en");
    expect(DEFAULT_LOCALE).toBe("en");
    expect(isLocale("kk") && isLocale("ru") && isLocale("en")).toBe(true);
    expect(isLocale("de")).toBe(false);
  });
});

describe("translate() with fallback", () => {
  it("translates in all three languages", () => {
    expect(translate("en", "dashboard.continueLearning")).toBe("Continue Learning");
    expect(translate("ru", "dashboard.continueLearning")).toBe("Продолжить обучение");
    expect(translate("kk", "dashboard.continueLearning")).toBe("Оқуды жалғастыру");
  });
  it("interpolates variables", () => {
    expect(translate("en", "dashboard.greeting", { name: "Anna" })).toBe("Hi, Anna");
    expect(translate("ru", "dashboard.greeting", { name: "Анна" })).toBe("Привет, Анна");
    expect(translate("kk", "dashboard.greeting", { name: "Айгерим" })).toBe("Сәлем, Айгерим");
  });
  it("never shows raw keys — humanizes unknown keys", () => {
    const out = translate("kk", "dashboard.totallyMissing");
    expect(out).not.toContain("dashboard.totallyMissing");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("plural rules per language", () => {
  it("english one/other", () => {
    expect(translate("en", "common.wordsToReview", { count: 1 })).toBe("You have 1 word to review.");
    expect(translate("en", "common.wordsToReview", { count: 5 })).toBe("You have 5 words to review.");
  });
  it("russian one/few/many", () => {
    expect(translate("ru", "common.wordsToReview", { count: 1 })).toContain("1 слово");
    expect(translate("ru", "common.wordsToReview", { count: 3 })).toContain("3 слова");
    expect(translate("ru", "common.wordsToReview", { count: 5 })).toContain("5 слов");
  });
  it("kazakh plural resolves without crashing", () => {
    expect(translate("kk", "common.wordsToReview", { count: 1 })).toContain("1");
    expect(translate("kk", "common.wordsToReview", { count: 5 })).toContain("5");
  });
  it("Intl.PluralRules categories differ as expected", () => {
    expect(pluralCategory("ru", 1)).toBe("one");
    expect(pluralCategory("ru", 2)).toBe("few");
    expect(pluralCategory("ru", 5)).toBe("many");
    expect(pluralCategory("en", 5)).toBe("other");
  });
});

describe("locale-aware formatting", () => {
  it("formats XP with grouping", () => {
    expect(formatXP("en", 1200)).toContain("1,200");
    expect(formatXP("ru", 1200)).toContain("XP");
    expect(formatNumber("kk", 3.5)).not.toBe("");
  });
  it("formats dates per locale", () => {
    const d = new Date("2026-03-15T12:00:00Z");
    expect(formatDate("en", d)).not.toBe(formatDate("ru", d));
  });
});

describe("dictionary parity (no missing keys in kk/ru)", () => {
  const enKeys = collectKeys(getDictionary("en")).sort();
  for (const locale of ["kk", "ru"] as const) {
    it(`${locale} covers every English key`, () => {
      const keys = new Set(collectKeys(getDictionary(locale)));
      const missing = enKeys.filter((k) => !keys.has(k));
      expect(missing).toEqual([]);
    });
  }
  it("dictionaries are non-empty and nested", () => {
    expect(enKeys.length).toBeGreaterThan(100);
  });
  it("every static t() key used in code exists in English", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const root = path.resolve(__dirname, "..", "..", "..");
    const used = new Set<string>();
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !e.name.includes(".test.")) {
          const src = fs.readFileSync(p, "utf8");
          const re = /\bt\(\s*["']([^"']+)["']/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(src)) !== null) {
            if (!m[1].includes("{") && !m[1].includes("+")) used.add(m[1]);
          }
        }
      }
    };
    walk(path.join(root, "src"));
    const enSet = new Set(enKeys);
    const enArr = Array.from(enSet);
    // Plural-object leaves (common.dayStreak) resolve via collectKeys children.
    const ok = (k: string) => enSet.has(k) || enArr.some((ek) => ek.startsWith(k + "."));
    const missing = Array.from(used).filter((k) => !ok(k)).sort();
    expect(missing).toEqual([]);
  });
});

describe("AI teacher language context", () => {
  it("system prompt carries interface_language + learning_language", () => {
    for (const lang of ["kk", "ru", "en"] as const) {
      const prompt = buildTeacherSystemPrompt({ level: "B1", goals: ["Travel"], interfaceLanguage: lang });
      expect(prompt).toContain(`interface_language: ${lang}`);
      expect(prompt).toContain("learning_language: en");
      // Compact: no dictionary dumps.
      expect(prompt.length).toBeLessThan(1200);
    }
    expect(buildTeacherSystemPrompt({ level: "B1", goals: [] })).toContain("interface_language: en");
  });
  it("offline fallback speaks the interface language", () => {
    expect(fallbackTeacherReply("grammar?", "kk")).toContain("офлайн");
    expect(fallbackTeacherReply("grammar?", "ru")).toContain("офлайн");
    expect(fallbackTeacherReply("blabla xyz?", "en")).toContain("offline");
    expect(fallbackTeacherReply("blabla xyz?", "en")).not.toContain("офлайн");
  });
});
