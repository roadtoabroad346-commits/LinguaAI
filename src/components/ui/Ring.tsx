"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function RingProgress({
  value,
  max = 100,
  size = 72,
  stroke = 8,
  label,
  sublabel,
  tone = "brand",
  className,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: React.ReactNode;
  sublabel?: string;
  tone?: "brand" | "success" | "warm";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const strokeColor =
    tone === "success" ? "url(#ring-success)" : tone === "warm" ? "url(#ring-warm)" : "url(#ring-brand)";
  return (
    <div className={cn("inline-flex items-center gap-3", className)} role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={sublabel ?? "progress"}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ring-brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
            <linearGradient id="ring-success" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            <linearGradient id="ring-warm" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-ink-100 dark:stroke-ink-800" />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        </svg>
        {label && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums text-ink-900 dark:text-ink-50">
            {label}
          </div>
        )}
      </div>
      {sublabel && <div className="text-xs font-medium text-ink-500 dark:text-ink-400">{sublabel}</div>}
    </div>
  );
}
