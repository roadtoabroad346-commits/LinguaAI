import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800", className)}
      {...props}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-label="Loading" role="status">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-40" />
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-ink-200/70 bg-white p-5 dark:border-ink-800 dark:bg-ink-900", className)} aria-hidden>
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="mt-2 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}
