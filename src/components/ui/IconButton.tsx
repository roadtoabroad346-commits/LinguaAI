"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

/**
 * Header icon button — plain <button> with CSS press feedback.
 * Previously used framer-motion `whileTap` per button (JS spring per tap);
 * CSS active:scale is GPU-cheap and avoids jank on low-end Android.
 */
export function IconButton({
  label,
  className,
  children,
  onClick,
  active = false,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDrag" | "onDragEnd"> & { label: string; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        haptic(6);
        onClick?.(e);
      }}
      className={cn(
        "touch-44 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-[transform,colors] duration-150 active:scale-90 sm:h-11 sm:w-11",
        active
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
          : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
