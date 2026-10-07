"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Compass,
  BookOpen,
  BookMarked,
  Layers,
  PenLine,
  BookText,
  Headphones,
  Mic,
  NotebookPen,
  SpellCheck,
  Sparkles,
  Trophy,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

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
  Mic,
  NotebookPen,
  SpellCheck,
  Sparkles,
  Trophy,
};

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.primary")} className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href as never}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-w-0 items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-brand-800 dark:text-brand-100"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-50"
            )}
          >
            {active && (
              <motion.span
                layoutId="sidebar-active"
                transition={{ type: "spring", stiffness: 480, damping: 40 }}
                className="absolute inset-0 rounded-2xl bg-brand-100 dark:bg-brand-950"
              />
            )}
            <Icon className="relative h-[18px] w-[18px] shrink-0" aria-hidden />
            <span className="relative min-w-0 flex-1 truncate">{t(item.key)}</span>
            {active && <span aria-hidden className="relative h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-300" />}
          </Link>
        );
      })}
    </nav>
  );
}
