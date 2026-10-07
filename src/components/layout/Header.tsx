import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Badge } from "@/components/ui/feedback";
export function Header({ right }: { right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white">L</span>
          {APP_NAME}
          <Badge tone="brand">Beta</Badge>
        </Link>
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
