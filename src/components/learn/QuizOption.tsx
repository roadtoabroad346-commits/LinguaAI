"use client";

import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/motion/hooks";

export function QuizOption({
  label,
  prefix,
  state = "idle",
  disabled = false,
  onSelect,
  role = "radio",
  checked,
}: {
  label: string;
  prefix?: string;
  state?: "idle" | "selected" | "correct" | "wrong";
  disabled?: boolean;
  onSelect?: () => void;
  role?: string;
  checked?: boolean;
}) {
  return (
    <motion.button
      type="button"
      role={role}
      aria-checked={checked ?? state === "selected"}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        if (disabled) return;
        haptic(state === "correct" ? [10, 30, 10] : 8);
        onSelect?.();
      }}
      disabled={disabled}
      animate={
        state === "wrong"
          ? { x: [0, -7, 7, -4, 4, 0] }
          : state === "correct"
            ? { scale: [1, 1.02, 1] }
            : {}
      }
      transition={{ duration: 0.4 }}
      className={cn(
        "touch-44 flex min-h-[52px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] transition-colors",
        state === "correct" &&
          "border-green-500 bg-green-50 font-semibold text-green-900 shadow-[0_0_0_3px_rgb(16_185_129/0.18)] dark:bg-green-950 dark:text-green-100",
        state === "wrong" &&
          "border-red-400 bg-red-50 font-medium text-red-800 dark:bg-red-950 dark:text-red-100",
        state === "selected" &&
          "border-brand-600 bg-brand-50 font-semibold text-brand-900 shadow-[0_0_0_3px_rgb(99_102_241/0.16)] dark:border-brand-400 dark:bg-brand-950 dark:text-brand-100",
        state === "idle" &&
          "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-600",
        disabled && state === "idle" && "opacity-70"
      )}
    >
      {prefix && (
        <span
          aria-hidden
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            state === "correct"
              ? "bg-green-600 text-white"
              : state === "wrong"
                ? "bg-red-500 text-white"
                : state === "selected"
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
          )}
        >
          {state === "correct" ? <Check className="h-3.5 w-3.5" /> : state === "wrong" ? <X className="h-3.5 w-3.5" /> : prefix}
        </span>
      )}
      <span className="min-w-0 flex-1">{label}</span>
    </motion.button>
  );
}
