"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Lazy translation: one compact Gemini call per explicit tap, cached to the dictionary. */
export function TranslationPanel({ word, initialTranslation, signedIn, nativeLang }: {
  word: string;
  initialTranslation: string | null;
  signedIn: boolean;
  nativeLang: string | null;
}) {
  const { t, locale } = useTranslation();
  const [translation, setTranslation] = useState<string | null>(initialTranslation);
  // Default target follows the UI language (not a hardcoded "Spanish").
  const [target, setTarget] = useState(nativeLang ?? (locale === "kk" ? "Kazakh" : locale === "ru" ? "Russian" : "Spanish"));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vocab/translate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word, targetLang: target }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("learn.translationFailed"));
      setTranslation(json.translation);
      if (signedIn) {
        await fetch("/api/dictionary", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ word, translation: json.translation }),
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("learn.translationFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4">
      <h2 className="text-sm font-semibold text-ink-900">{t("learn.translation")}</h2>
      {translation ? (
        <p className="mt-1 text-base text-ink-900">{translation}</p>
      ) : (
        <p className="mt-1 text-sm text-ink-500">{t("learn.noTranslation")}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label htmlFor="tr-lang" className="text-xs text-ink-500">{t("language.label")}</label>
        <input
          id="tr-lang"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="h-9 w-36 min-w-0 rounded-xl border border-ink-200 px-2 text-sm"
          maxLength={48}
        />
        <Button size="sm" variant="secondary" onClick={translate} loading={loading} disabled={loading || target.trim().length < 2}>
          {translation ? t("learn.retranslate") : t("learn.translateVerb")}
        </Button>
      </div>
      {error && <div className="mt-2"><Alert tone="warning" title={t("learn.translationUnavailable")}>{error}</Alert></div>}
    </div>
  );
}
