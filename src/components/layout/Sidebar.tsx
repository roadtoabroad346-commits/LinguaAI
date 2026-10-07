"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Route, Compass, BookOpen, BookMarked, Layers, PenLine, BookText, Headphones, Mic, NotebookPen, SpellCheck, Sparkles, Flame, Trophy, type LucideIcon } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
const ICONS: Record<string, LucideIcon> = { LayoutDashboard, Flame, Route, Compass, BookOpen, BookMarked, Layers, PenLine, BookText, Headphones, Mic, NotebookPen, SpellCheck, Sparkles, Trophy };
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.primary")} className={cn("flex flex-col gap-1", className)}>
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link key={item.href} href={item.href as never} aria-current={active ? "page" : undefined}
            className={cn("flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900")}>
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
