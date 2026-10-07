"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Sticky thumb-reachable action bar for lessons/quizzes. */
export function StickyActionBar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-24 z-20 md:bottom-6", className)}>
      <div className="glass-strong flex items-center gap-2 rounded-3xl border border-ink-200/70 p-2.5 shadow-sheet dark:border-ink-700">
        {children}
      </div>
    </div>
  );
}
