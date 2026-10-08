"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Header auth cluster — single source of truth via useAuth. No ad-hoc getUser calls. */
export function UserMenu() {
  const { status, email, level } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (status === "loading") {
    return (
      <div
        className="h-8 w-24 animate-pulse rounded-lg bg-ink-100 dark:bg-ink-800"
        aria-label={t("common.loadingAccount")}
        role="status"
      />
    );
  }

  if (status === "anonymous") {
    return (
      <>
        <Link href="/login">
          <Button variant="ghost" size="sm">
            {t("landing.login")}
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm">{t("landing.signup")}</Button>
        </Link>
      </>
    );
  }

  const initial = (email ?? "U").slice(0, 1).toUpperCase();
  return (
    <div className="relative flex items-center gap-2">
      {level && (
        <span className="hidden rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800 sm:inline-block dark:bg-brand-950 dark:text-brand-200">
          {level}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={email ?? t("auth.profile")}
        className="flex items-center gap-2 rounded-full border border-ink-200/70 py-1 pl-1 pr-2 transition-colors hover:border-brand-300 dark:border-ink-700"
      >
        <Avatar name={email ?? "U"} size="sm" />
        <span className="hidden max-w-32 truncate text-xs font-medium text-ink-600 sm:block dark:text-ink-300">
          {email}
        </span>
        <span aria-hidden className="text-xs text-ink-400">
          {initial ? "▾" : ""}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-ink-200/70 bg-white p-2 shadow-sheet dark:border-ink-700 dark:bg-ink-900"
        >
          <p className="truncate px-3 py-2 text-xs text-ink-500" aria-live="polite">
            {email}
            {level ? ` · ${level}` : ""}
          </p>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            {t("auth.profile")}
          </Link>
          <Link
            href="/progress"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            {t("nav.progress")}
          </Link>
          <Link
            href="/auth/signout"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            {t("auth.signout")}
          </Link>
        </div>
      )}
    </div>
  );
}
