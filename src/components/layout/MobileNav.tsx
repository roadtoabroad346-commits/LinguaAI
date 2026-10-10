"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AudioLines,
  BookMarked,
  BookOpen,
  BookText,
  Compass,
  Flame,
  Headphones,
  Home,
  Layers,
  LayoutDashboard,
  Mic,
  NotebookPen,
  PenLine,
  Route,
  Sparkles,
  SpellCheck,
  Trophy,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Flame,
  Route,
  Compass,
  BookOpen,
  BookMarked,
  Layers,
  PenLine,
  BookText,
  Headphones,
  AudioLines,
  Mic,
  NotebookPen,
  SpellCheck,
  Sparkles,
  Trophy,
};

const MAIN_TABS = [
  { href: "/dashboard", key: "nav.home", icon: Home },
  { href: "/smart-path", key: "nav.smartPath", icon: Compass },
  { href: "/vocabulary", key: "nav.words", icon: BookOpen },
  { href: "/daily-challenge", key: "nav.challenge", icon: Flame },
] as const;

/**
 * Native-feeling bottom tab bar: 44px+ targets, animated active pill,
 * hide-on-scroll-down / show-on-scroll-up, safe-area aware.
 * The 5th slot is a "More" sheet with every practice (parity with desktop sidebar).
 */
export function BottomTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [hidden, setHidden] = React.useState(false);
  const [moreOpen, setMoreOpen] = React.useState(false);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      lastY.current = y;
      if (moreOpen) return;
      if (y < 80) {
        setHidden(false);
        return;
      }
      if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [moreOpen]);

  // Close the sheet on navigation + Escape.
  React.useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);
  React.useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const moreActive =
    pathname !== null &&
    !MAIN_TABS.some((tab) => pathname === tab.href || pathname.startsWith(tab.href + "/"));

  return (
    <>
      <motion.nav
        aria-label={t("nav.mobile")}
        animate={{ y: hidden ? "110%" : "0%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe md:hidden"
      >
        <div className="glass-strong mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.75rem] border border-ink-200/70 p-1.5 shadow-sheet dark:border-ink-700">
          {MAIN_TABS.map((tab) => {
            const active = pathname === tab.href || (tab.href !== "/dashboard" && pathname?.startsWith(tab.href + "/"));
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href as never}
                aria-current={active ? "page" : undefined}
                onClick={() => haptic(6)}
                className={cn(
                  "relative flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold transition-colors",
                  active ? "text-brand-700 dark:text-brand-200" : "text-ink-500 dark:text-ink-400"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="bottom-tab-active"
                    transition={{ type: "spring", stiffness: 520, damping: 38 }}
                    className="absolute inset-0 rounded-2xl bg-brand-100 dark:bg-brand-950"
                  />
                )}
                <Icon className="relative h-5 w-5" aria-hidden />
                <span className="relative max-w-full truncate leading-none">{t(tab.key)}</span>
                {active && <span aria-hidden className="relative mt-1 h-1 w-1 rounded-full bg-brand-600 dark:bg-brand-300" />}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              haptic(6);
              setMoreOpen((v) => !v);
            }}
            aria-expanded={moreOpen}
            aria-label={t("nav.more")}
            className={cn(
              "relative flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-semibold transition-colors",
              moreActive || moreOpen ? "text-brand-700 dark:text-brand-200" : "text-ink-500 dark:text-ink-400"
            )}
          >
            {(moreActive || moreOpen) && (
              <motion.span
                layoutId="bottom-tab-active"
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className="absolute inset-0 rounded-2xl bg-brand-100 dark:bg-brand-950"
              />
            )}
            <User className="relative h-5 w-5" aria-hidden />
            <span className="relative max-w-full truncate leading-none">{t("nav.more")}</span>
            {(moreActive || moreOpen) && <span aria-hidden className="relative mt-1 h-1 w-1 rounded-full bg-brand-600 dark:bg-brand-300" />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-ink-950/50 md:hidden"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("nav.more")}
            initial={{ y: "100%" }}
            animate={{ y: "0%" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-x-0 bottom-0 z-50 px-3 pb-safe md:hidden"
          >
            <div className="glass-strong mx-auto max-h-[70dvh] max-w-md overflow-y-auto rounded-[1.75rem] border border-ink-200/70 p-3 shadow-sheet dark:border-ink-700">
              <div className="mb-1 flex items-center justify-between px-1">
                <p className="text-sm font-bold">{t("nav.more")}</p>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label={t("common.close")}
                  className="touch-44 flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                >
                  <X className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href as never}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        haptic(6);
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "flex min-w-0 items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium",
                        active
                          ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-100"
                          : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                      {active && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-300" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Back-compat: existing AppShell imports MobileNav.
export function MobileNav() {
  return <BottomTabBar />;
}
