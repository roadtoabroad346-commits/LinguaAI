import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/feedback";

export function Header({ right, title, subtitle, homeHref }: { right?: React.ReactNode; title?: string; subtitle?: string; homeHref?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/80 bg-white/95 pt-safe backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:h-16 sm:gap-3 sm:px-4">
        <Link href={(homeHref ?? "/") as never} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
          <span
            aria-hidden
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-base font-extrabold text-white shadow-sm sm:h-9 sm:w-9 sm:text-lg"
          >
            L
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-[16px] font-bold leading-none tracking-tight sm:text-[17px]">
              {title ?? APP_NAME}
            </span>
            {subtitle ? (
              <span className="block truncate text-xs text-ink-500 dark:text-ink-400">{subtitle}</span>
            ) : (
              <span className="mt-0.5 inline-block">
                <Badge tone="brand">Beta</Badge>
              </span>
            )}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{right}</div>
      </div>
    </header>
  );
}
