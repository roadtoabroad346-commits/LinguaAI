"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

export function IconButton({
  label,
  className,
  children,
  onClick,
  active = false,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDrag" | "onDragEnd"> & { label: string; active?: boolean }) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
      onClick={(e) => {
        haptic(6);
        onClick?.(e);
      }}
      className={cn(
        "touch-44 inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
        active
          ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
          : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
