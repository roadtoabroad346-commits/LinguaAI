"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Compass, Flame, Home, User } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

const TABS = [
  { href: "/dashboard", key: "nav.home", icon: Home },
  { href: "/smart-path", key: "nav.smartPath", icon: Compass },
  { href: "/vocabulary", key: "nav.words", icon: BookOpen },
  { href: "/daily-challenge", key: "nav.challenge", icon: Flame },
  { href: "/profile", key: "nav.profile", icon: User },
] as const;

/**
 * Native-feeling bottom tab bar: 44px+ targets, animated active pill,
 * hide-on-scroll-down / show-on-scroll-up, safe-area aware.
 */
export function BottomTabBar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [hidden, setHidden] = React.useState(false);
  const lastY = React.useRef(0);

  React.useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY.current;
      lastY.current = y;
      if (y < 80) {
        setHidden(false);
        return;
      }
      if (dy > 6) setHidden(true);
      else if (dy < -6) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      aria-label={t("nav.mobile")}
      animate={{ y: hidden ? "110%" : "0%" }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe md:hidden"
    >
      <div className="glass-strong mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[1.75rem] border border-ink-200/70 p-1.5 shadow-sheet dark:border-ink-700">
        {TABS.map((tab) => {
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
      </div>
    </motion.nav>
  );
}

// Back-compat: existing AppShell imports MobileNav.
export function MobileNav() {
  return <BottomTabBar />;
}
