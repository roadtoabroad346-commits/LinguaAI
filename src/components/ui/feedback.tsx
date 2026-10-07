"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  default: "bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200",
  brand: "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200",
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
};

export function Badge({
  tone = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", tones[tone], className)}
      {...props}
    />
  );
}

export function Chip({
  active = false,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "touch-44 inline-flex h-9 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-pop dark:border-brand-400 dark:bg-brand-500"
          : "border-ink-200 bg-white text-ink-600 hover:border-brand-300 hover:text-ink-900 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300",
        className
      )}
      {...props}
    />
  );
}

export function Progress({
  value,
  max = 100,
  className,
  label,
  tone = "brand",
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  tone?: "brand" | "success" | "warm";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const bar =
    tone === "success"
      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
      : tone === "warm"
        ? "bg-gradient-to-r from-amber-500 to-orange-500"
        : "bg-gradient-to-r from-brand-600 to-violet-500";
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex justify-between text-xs font-medium text-ink-500 dark:text-ink-400">
          <span className="min-w-0 truncate">{label}</span>
          <span className="tabular-nums">{Math.round(pct)}%</span>
        </div>
      )}
      <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <motion.div
          className={cn("h-full rounded-full", bar)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
    </div>
  );
}

export function Alert({
  tone = "default",
  title,
  children,
  className,
}: {
  tone?: "default" | "success" | "warning" | "danger" | "brand";
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const map: Record<string, string> = {
    default: "border-ink-200 bg-ink-50 text-ink-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200",
    brand: "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100",
    success: "border-green-200 bg-green-50 text-green-900 dark:border-green-900 dark:bg-green-950 dark:text-green-100",
    warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
    danger: "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
  };
  return (
    <div role="alert" className={cn("rounded-2xl border p-4 text-sm leading-relaxed", map[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={cn(title && "mt-1")}>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center dark:border-ink-700 dark:bg-ink-900">
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">{icon}</div>}
      <p className="font-display text-base font-semibold text-ink-900 dark:text-ink-50">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-relaxed text-ink-500 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
