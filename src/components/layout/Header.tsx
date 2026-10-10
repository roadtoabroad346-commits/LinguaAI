import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/feedback";

export function Header({ right, title, subtitle, homeHref }: { right?: React.ReactNode; title?: string; subtitle?: string; homeHref?: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 glass pt-safe dark:border-ink-800">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href={(homeHref ?? "/") as never} className="flex min-w-0 items-center gap-2.5" aria-label={`${APP_NAME} home`}>
          <span
            aria-hidden
            className="bg-brand-gradient flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-pop"
          >
            L
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-[17px] font-bold leading-none tracking-tight">
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
        <div className="flex shrink-0 items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
