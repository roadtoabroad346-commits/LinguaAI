import { cn } from "@/lib/utils";
import { Reveal } from "@/lib/motion/components";

export function Section({
  eyebrow,
  title,
  desc,
  children,
  className,
  align = "center",
}: {
  eyebrow?: string;
  title?: string;
  desc?: string;
  children: React.ReactNode;
  className?: string;
  align?: "center" | "left";
}) {
  const centered = align === "center";
  return (
    <section className={cn("mx-auto w-full max-w-6xl px-4 py-14 md:py-20", className)}>
      {(eyebrow || title || desc) && (
        <Reveal className={cn("max-w-2xl", centered ? "mx-auto text-center" : "text-left")}>
          {eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-300">{eyebrow}</p>
          )}
          {title && <h2 className="font-display mt-2 text-balance text-2xl font-bold tracking-tight md:text-4xl">{title}</h2>}
          {desc && <p className="mt-3 text-pretty text-base leading-relaxed text-ink-500 dark:text-ink-400">{desc}</p>}
        </Reveal>
      )}
      <div className="mt-8 md:mt-10">{children}</div>
    </section>
  );
}
