"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warm";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-white shadow-pop hover:brightness-110 disabled:bg-none disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none dark:disabled:bg-ink-800 dark:disabled:text-ink-300",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:border-brand-300 hover:bg-brand-50/60 disabled:text-ink-300 dark:bg-ink-900 dark:text-ink-100 dark:border-ink-700 dark:hover:bg-ink-800",
  ghost: "text-ink-600 hover:bg-ink-100 disabled:text-ink-300 dark:text-ink-300 dark:hover:bg-ink-800",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-ink-200 dark:disabled:bg-ink-800",
  warm: "bg-warm-gradient text-white shadow-pop hover:brightness-110 disabled:bg-none disabled:bg-ink-200 disabled:text-ink-500 dark:disabled:bg-ink-800 dark:disabled:text-ink-300",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-base",
};

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onAnimationStart" | "onDragStart" | "onDrag" | "onDragEnd"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  success?: boolean;
  shine?: boolean;
  haptics?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  success = false,
  shine,
  haptics = true,
  disabled,
  className,
  children,
  onClick,
  ...props
}: ButtonProps) {
  const showShine = shine ?? variant === "primary";
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 500, damping: 32 }}
      className={cn(
        "touch-44 inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[filter,background-color,border-color] focus-visible:outline-2 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        showShine && !disabled && !loading && "btn-shine",
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(e) => {
        if (haptics) haptic(8);
        onClick?.(e);
      }}
      {...(props as Record<string, unknown>)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="inline-flex items-center gap-2"
          >
            <Spinner size="sm" aria-hidden />
            <span className="opacity-80">…</span>
          </motion.span>
        ) : success ? (
          <motion.span
            key="success"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className="inline-flex items-center gap-2"
          >
            <Check className="h-4 w-4" aria-hidden />
            {children}
          </motion.span>
        ) : (
          <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2">
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Spinner({
  size = "md",
  className,
  ...props
}: {
  size?: Size;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const dims = size === "sm" ? "h-4 w-4" : size === "lg" || size === "xl" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span
      role="status"
      className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", dims, className)}
      {...props}
    />
  );
}
