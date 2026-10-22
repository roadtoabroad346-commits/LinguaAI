"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEVELS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { Alert } from "@/components/ui/feedback";

const LEVEL_HINTS: Record<string, { kk: string; ru: string; en: string }> = {
  A1: { kk: "Қарапайым сөздер мен фразалар", ru: "Простые слова и фразы", en: "Basic words and phrases" },
  A2: { kk: "Күнделікті сөйлесу", ru: "Повседневное общение", en: "Everyday conversation" },
  B1: { kk: "Сапар және жұмыс", ru: "Путешествия и работа", en: "Travel and work topics" },
  B2: { kk: "Еркін пікір алмасу", ru: "Свободное обсуждение", en: "Free discussion" },
  C1: { kk: "Кәсіби деңгей", ru: "Профессиональный уровень", en: "Professional fluency" },
};

/**
 * Manual level selection — the zero-friction path for demos, jury reviews and
 * investors who already know their level. Writes the same canonical
 * profile.level ("A1".."C1") the placement test writes, so every feature sees
 * a properly personalized account immediately.
 */
export function ManualLevelPicker() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(level: string) {
    if (saving) return;
    setError(null);
    setSaving(level);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) {
        setError(t("placement.pickLevelError"));
        return;
      }
      // Level set → routing treats placement as done → straight to the app.
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(t("placement.pickLevelError"));
    } finally {
      setSaving(null);
    }
  }

  const hintLang = (["kk", "ru", "en"].includes(locale) ? locale : "en") as "kk" | "ru" | "en";

  return (
    <div>
      <p className="text-sm font-semibold text-ink-700 dark:text-ink-200">{t("placement.pickLevel")}</p>
      <p className="mt-1 text-sm text-ink-500">{t("placement.pickLevelDesc")}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => pick(level)}
            disabled={saving !== null}
            className="touch-44 flex min-h-[64px] flex-col items-center justify-center rounded-xl border border-ink-200 bg-white px-3 py-2 text-center transition hover:border-brand-400 hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-700 dark:bg-ink-900/60 dark:hover:border-brand-500 dark:hover:bg-brand-500/10"
            aria-label={t("placement.pickLevelAria", { level })}
          >
            <span className="text-lg font-bold text-brand-700 dark:text-brand-300">
              {saving === level ? "…" : level}
            </span>
            <span className="text-[11px] leading-tight text-ink-500">{LEVEL_HINTS[level][hintLang]}</span>
          </button>
        ))}
      </div>
      {error && (
        <Alert tone="danger" className="mt-3" title={t("placement.pickLevelError")}>
          {error}
        </Alert>
      )}
    </div>
  );
}
