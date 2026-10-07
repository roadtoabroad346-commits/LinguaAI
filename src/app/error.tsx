"use client";

import { useTranslation } from "@/lib/i18n/I18nProvider";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useTranslation();
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center" role="alert">
      <h1 className="text-xl font-bold">{t("common.somethingWrong")}</h1>
      <p className="text-sm text-ink-600">
        {t("errors.loadFailed")}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        {t("common.retry")}
      </button>
      {error?.digest && <p className="text-xs text-ink-400">{error.digest}</p>}
    </main>
  );
}
