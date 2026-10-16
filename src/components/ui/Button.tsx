"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "warm";
type Size = "sm" | "md" | "lg" | "xl";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-500 disabled:shadow-none dark:bg-brand-500 dark:hover:bg-brand-400 dark:disabled:bg-ink-800 dark:disabled:text-ink-300",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:border-brand-300 hover:bg-brand-50/60 disabled:text-ink-300 dark:bg-ink-900 dark:text-ink-100 dark:border-ink-700 dark:hover:bg-ink-800",
  ghost: "text-ink-600 hover:bg-ink-100 disabled:text-ink-300 dark:text-ink-300 dark:hover:bg-ink-800",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-ink-200 dark:disabled:bg-ink-800",
  warm: "bg-amber-500 text-ink-950 shadow-sm hover:bg-amber-400 disabled:bg-ink-200 disabled:text-ink-500 dark:disabled:bg-ink-800 dark:disabled:text-ink-300",
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
  const showShine = shine ?? false;
  return (
    <button
      className={cn(
        "touch-44 inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,filter,background-color,border-color] duration-150 hover:-translate-y-px active:translate-y-0 active:scale-[0.97] focus-visible:outline-2 disabled:cursor-not-allowed disabled:transform-none",
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
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <Spinner size="sm" aria-hidden />
            <span className="opacity-80">…</span>
          </span>
        ) : success ? (
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" aria-hidden />
            {children}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            {children}
          </span>
        )}
    </button>
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
