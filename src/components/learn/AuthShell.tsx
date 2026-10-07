import { cn } from "@/lib/utils";

export function AuthShell({
  title,
  desc,
  children,
  wide = false,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="bg-mesh min-h-dvh">
      <div className={cn("mx-auto w-full px-4 py-10 md:py-14", wide ? "max-w-xl" : "max-w-md")}>
        <div className="rounded-[2rem] border border-ink-200/70 bg-white p-6 shadow-card dark:border-ink-700 dark:bg-ink-900 md:p-8">
          <h1 className="font-display text-balance text-2xl font-extrabold tracking-tight">{title}</h1>
          {desc && <p className="mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400">{desc}</p>}
          <div className="mt-5">{children}</div>
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">A1–C1 · Smart Path · XP & streaks</p>
      </div>
    </main>
  );
}
