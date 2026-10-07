"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

export function Tabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: ReadonlyArray<{ value: T; label: React.ReactNode; icon?: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "no-scrollbar flex snap-x gap-1 overflow-x-auto rounded-2xl border border-ink-200/70 bg-ink-100/70 p-1 dark:border-ink-700 dark:bg-ink-900",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => {
              haptic(6);
              onChange(opt.value);
            }}
            className={cn(
              "touch-44 relative flex h-10 min-w-0 flex-1 snap-start items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors",
              active ? "text-ink-900 dark:text-white" : "text-ink-500 hover:text-ink-800 dark:text-ink-400"
            )}
          >
            {active && (
              <motion.span
                layoutId="linguaai-tab-pill"
                transition={{ type: "spring", stiffness: 480, damping: 38 }}
                className="absolute inset-0 rounded-xl bg-white shadow-card dark:bg-ink-700"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
