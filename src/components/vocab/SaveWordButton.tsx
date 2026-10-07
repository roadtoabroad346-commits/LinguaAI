"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { haptic } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";

const LOCAL_KEY = "linguaai:saved-words";

export function readLocalSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeLocalSaved(words: string[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(words));
  } catch {
    // best-effort
  }
}

/** Save/unsave toggle with heart/bookmark pop. Falls back to localStorage when signed out. */
export function SaveWordButton({ word, initialSaved, signedIn, size = "sm" }: {
  word: string;
  initialSaved: boolean;
  signedIn: boolean;
  size?: "sm" | "md";
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    haptic(saved ? 8 : [10, 30, 10]);
    if (!signedIn) {
      const current = readLocalSaved();
      const next = current.includes(word) ? current.filter((w) => w !== word) : [...current, word];
      writeLocalSaved(next);
      setSaved(next.includes(word));
      setBusy(false);
      return;
    }
    try {
      // Optimistic UI.
      setSaved((s) => !s);
      if (saved) {
        const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`, { method: "DELETE" });
        if (!res.ok) throw new Error("remove failed");
        setSaved(false);
      } else {
        const res = await fetch("/api/dictionary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ word }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "save failed");
        setSaved(true);
      }
    } catch {
      setSaved(initialSaved);
      setError(t("learn.couldNotUpdate"));
    } finally {
      setBusy(false);
    }
  }

  const dims = size === "md" ? "h-11 px-4 text-sm" : "h-9 px-3 text-xs";

  return (
    <span className="inline-flex items-center gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        aria-label={saved ? t("learn.removeWord", { word }) : t("learn.saveWord", { word })}
        className={cn(
          "touch-44 inline-flex items-center gap-1.5 rounded-full font-bold transition-colors disabled:opacity-60",
          dims,
          saved
            ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
            : "bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-200"
        )}
      >
        <motion.span
          key={String(saved)}
          initial={{ scale: 0.5, rotate: -18 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 18 }}
          className="inline-flex"
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </motion.span>
        {saved ? t("learn.savedWord") : t("learn.save")}
      </motion.button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
