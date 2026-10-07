import Link from "next/link";
import { getRequestLocale, getServerT } from "@/lib/i18n/server";

export default function NotFound() {
  const t = getServerT(getRequestLocale());
  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">404</p>
      <h1 className="text-xl font-bold">{t("common.notFoundTitle")}</h1>
      <p className="text-sm text-ink-600">{t("common.notFoundDesc")}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
        >
          {t("nav.dashboard")}
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-xl border border-ink-200 bg-white px-4 text-sm font-medium text-ink-800 hover:bg-ink-50"
        >
          {t("nav.home")}
        </Link>
      </div>
    </main>
  );
}
