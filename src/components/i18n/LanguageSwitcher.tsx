"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check } from "lucide-react";
import { LOCALES, LOCALE_META } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

/**
 * Global language selector: Қазақша / Русский / English.
 * Keyboard-accessible listbox with visible focus and native labels.
 */
export function LanguageSwitcher({
  variant = "compact",
  className,
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  function pick(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    setLocale(next);
    setOpen(false);
    // Soft refresh so Server Components re-render in the new language
    // without a full page reload.
    router.refresh();
  }

  const meta = LOCALE_META[locale];

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language.selectLanguage")}
        title={t("language.interfaceLanguage")}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 text-sm font-medium text-ink-700 transition-colors hover:border-ink-300 hover:bg-ink-50 focus-visible:outline-2 focus-visible:outline-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-brand-500 dark:hover:bg-ink-800"
      >
        <Globe className="h-4 w-4 shrink-0" aria-hidden />
        <span className={variant === "compact" ? "hidden sm:inline" : undefined}>
          {variant === "compact" ? meta.shortLabel : meta.label}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t("language.interfaceLanguage")}
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1 shadow-lg dark:border-ink-700 dark:bg-ink-900"
        >
          {LOCALES.map((code) => {
            const m = LOCALE_META[code];
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(code);
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-brand-600",
                  active ? "bg-brand-50 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100" : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800"
                )}
              >
                <span aria-hidden className="text-base leading-none">{m.flag}</span>
                <span className="min-w-0 flex-1 truncate">{m.label}</span>
                {active && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Full inline option list (onboarding + settings): big touch targets,
 * radio semantics, no dropdown needed.
 */
export function LanguageOptions({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (next: Locale) => void;
}) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("language.interfaceLanguage")} className="grid gap-2">
      {LOCALES.map((code) => {
        const m = LOCALE_META[code];
        const active = code === value;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(code)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-brand-600",
              active
                ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100 dark:border-brand-400 dark:bg-brand-950"
                : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-500"
            )}
          >
            <span aria-hidden className="text-2xl leading-none">{m.flag}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink-900 dark:text-ink-50">{m.label}</span>
              <span className="block text-xs text-ink-500">{t("language.savedDesc")}</span>
            </span>
            {active && <Check className="h-5 w-5 shrink-0 text-brand-700" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
