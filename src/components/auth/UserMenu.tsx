"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Header auth cluster — single source of truth via useAuth. No ad-hoc getUser calls. */
export function UserMenu() {
  const { status, email, level } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside tap (essential on phones) + Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        /* fall through to server signout */
      }
      // Server clears httpOnly cookies reliably (client alone can leave stale cookies).
      await fetch("/auth/signout", { method: "POST", cache: "no-store" }).catch(() => {});
    } finally {
      setOpen(false);
      setSigningOut(false);
      router.push("/login?signed_out=1");
      router.refresh();
    }
  }

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
        <Link href="/login" prefetch={false}>
          <Button variant="ghost" size="sm">
            {t("landing.login")}
          </Button>
        </Link>
        <Link href="/signup" prefetch={false}>
          <Button size="sm">{t("landing.signup")}</Button>
        </Link>
      </>
    );
  }

  const initial = (email ?? "U").slice(0, 1).toUpperCase();
  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {level && (
        <span className="hidden rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800 sm:inline-block dark:bg-brand-950 dark:text-brand-200">
          {level}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={email ?? t("auth.profile")}
        className="touch-44 flex min-h-[44px] items-center gap-2 rounded-full border border-ink-200/70 py-1 pl-1 pr-2 transition-colors hover:border-brand-300 dark:border-ink-700"
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
        <>
          {/* Mobile backdrop: a tap anywhere outside closes the menu, never triggers an action. */}
          <div
            className="fixed inset-0 z-40 bg-transparent md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 top-12 z-50 w-60 rounded-2xl border border-ink-200/70 bg-white p-2 shadow-sheet dark:border-ink-700 dark:bg-ink-900"
          >
            <p className="truncate px-3 py-2 text-xs text-ink-500" aria-live="polite">
              {email}
              {level ? ` · ${level}` : ""}
            </p>
            <Link
              href="/profile"
              prefetch={false}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="touch-44 flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              {t("auth.profile")}
            </Link>
            <Link
              href="/progress"
              prefetch={false}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="touch-44 flex min-h-[44px] items-center rounded-xl px-3 text-sm font-medium hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              {t("nav.progress")}
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="touch-44 flex min-h-[44px] w-full items-center rounded-xl px-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950"
            >
              {signingOut ? t("auth.signingOut") : t("auth.signout")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
