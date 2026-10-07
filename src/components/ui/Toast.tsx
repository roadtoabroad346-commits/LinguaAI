"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; desc?: string; tone?: "success" | "info" | "warning" };

const Ctx = React.createContext<{ push: (t: Omit<Toast, "id">) => void } | null>(null);

let nextId = 1;

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) return { push: () => {} };
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = React.useCallback((t: Omit<Toast, "id">) => {
    const id = nextId++;
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] mx-auto flex w-full max-w-sm flex-col gap-2 px-4 md:bottom-8">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className={cn(
                "glass-strong pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-pop",
                t.tone === "success"
                  ? "border-green-200 dark:border-green-900"
                  : t.tone === "warning"
                    ? "border-amber-200 dark:border-amber-900"
                    : "border-ink-200 dark:border-ink-700"
              )}
            >
              {t.tone === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : t.tone === "warning" ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              ) : (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                {t.desc && <p className="mt-0.5 text-xs text-ink-500">{t.desc}</p>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
