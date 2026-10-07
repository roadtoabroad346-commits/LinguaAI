import * as React from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "glass" | "elevated" | "outline";

const variantStyles: Record<CardVariant, string> = {
  default:
    "border border-ink-200/70 bg-white shadow-card dark:border-ink-800 dark:bg-ink-900",
  glass: "glass border border-white/40 shadow-card dark:border-ink-700",
  elevated: "border border-ink-200/60 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900",
  outline: "border-2 border-dashed border-ink-200 bg-transparent dark:border-ink-700",
};

export function Card({
  variant = "default",
  interactive = false,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant; interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-3xl p-5",
        variantStyles[variant],
        interactive && "transition-transform duration-200 active:scale-[0.99] motion-safe:hover:-translate-y-0.5",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("font-display text-base font-semibold text-ink-900 dark:text-ink-50", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400", className)} {...props} />;
}
