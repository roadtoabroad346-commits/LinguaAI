import { cn } from "@/lib/utils";

export function PageHero({
  title,
  desc,
  badges,
  action,
}: {
  title: string;
  desc?: string;
  badges?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="font-display min-w-0 flex-1 text-balance text-2xl font-extrabold tracking-tight md:text-3xl">
          {title}
        </h1>
        {badges}
      </div>
      {desc && <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-ink-500 dark:text-ink-400">{desc}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
