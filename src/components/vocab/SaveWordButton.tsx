"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

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

/** Save/unsave toggle. Falls back to localStorage when the learner is signed out. */
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
    setBusy(true);
    setError(null);
    if (!signedIn) {
      const current = readLocalSaved();
      const next = current.includes(word) ? current.filter((w) => w !== word) : [...current, word];
      writeLocalSaved(next);
      setSaved(next.includes(word));
      setBusy(false);
      return;
    }
    try {
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
      setError(t("learn.couldNotUpdate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Button size={size} variant={saved ? "secondary" : "primary"} onClick={toggle} loading={busy} aria-pressed={saved} aria-label={saved ? t("learn.removeWord", { word }) : t("learn.saveWord", { word })}>
        {saved ? `${t("learn.savedWord")} ✓` : t("learn.save")}
      </Button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
