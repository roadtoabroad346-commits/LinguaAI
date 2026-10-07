"use client";

import * as React from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { slideSheet } from "@/lib/motion/tokens";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const controls = useDragControls();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-ink-950/50 backdrop-blur-[2px]"
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "dialog"}
            variants={slideSheet}
            initial="hidden"
            animate="show"
            exit="exit"
            drag="y"
            dragControls={controls}
            dragConstraints={{ top: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose();
            }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-[1.75rem] border border-ink-200 bg-white shadow-sheet dark:border-ink-700 dark:bg-ink-900",
              "max-h-[88dvh] overflow-hidden pb-safe",
              className
            )}
          >
            <div
              className="flex cursor-grab touch-none items-center justify-center pt-3 active:cursor-grabbing"
              onPointerDown={(e) => controls.start(e)}
            >
              <div className="h-1.5 w-10 rounded-full bg-ink-200 dark:bg-ink-700" />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-2">
              {title && <h2 className="font-display text-lg font-bold text-ink-900 dark:text-ink-50">{title}</h2>}
              <button
                onClick={onClose}
                aria-label="Close"
                className="touch-44 ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 pb-6 pt-1">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
