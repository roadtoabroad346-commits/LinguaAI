"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Bottom tab bar on small screens — labels localized, flexible widths. */
export function MobileNav() {
  const { t } = useTranslation();
  const items = [
    { href: "/dashboard", key: "nav.home" },
    { href: "/daily-challenge", key: "nav.challenge" },
    { href: "/vocabulary", key: "nav.words" },
    { href: "/ai-teacher", key: "nav.ai" },
    { href: "/dictionary", key: "nav.saved" },
  ] as const;
  return (
    <nav
      aria-label={t("nav.mobile")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur md:hidden"
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2 text-center">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href as never}
            className="min-w-0 truncate rounded-lg px-1 py-2 text-xs font-medium text-ink-600 hover:bg-ink-100 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800"
          >
            {t(item.key)}
          </Link>
        ))}
      </div>
    </nav>
  );
}
