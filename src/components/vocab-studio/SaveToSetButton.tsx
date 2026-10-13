"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

/**
 * Save any word/phrase into one of the learner's Flashcards Pro sets.
 * Preserves source context (e.g. "reading:slug", "listening:slug").
 * Reuses the same card API — no disconnected copies: the card keeps
 * `source` so Smart Path / analytics can trace it back.
 */
export function SaveToSetButton({ word, definition, example, source }: {
  word: string; definition?: string; example?: string; source?: string;
}) {
  const [sets, setSets] = useState<Array<{ id: string; title: string }>>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/vocab-sets?filter=active").then((r) => r.json()).then((j) => setSets(j.sets ?? [])).catch(() => setSets([]));
  }, [open ]);

  async function save(setId: string) {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}/cards`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          front: word, back: definition || word, word,
          definition: definition || "", example: example || "",
          source: source || "exercise",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed.");
      setMsg("Saved ✓");
      window.setTimeout(() => setOpen(false), 800);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally { setBusy(false); }
  }

  return (
    <span className="relative inline-flex flex-col items-start gap-1">
      <Button size="sm" variant="secondary" onClick={() => { setOpen((v) => !v); setMsg(null); }} aria-expanded={open}>
        + Set
      </Button>
      {open && (
        <span className="absolute left-0 top-10 z-30 grid w-56 gap-1 rounded-2xl border border-ink-200 bg-white p-2 shadow-pop dark:border-ink-700 dark:bg-ink-900">
          {sets.length === 0 && <span className="p-2 text-xs text-ink-500">No sets yet — <a className="underline" href="/flashcards">create one</a>.</span>}
          {sets.slice(0, 8).map((s) => (
            <button key={s.id} disabled={busy} onClick={() => save(s.id)}
              className="truncate rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-50 dark:hover:bg-ink-800">
              {s.title}
            </button>
          ))}
          {msg && <span role="status" className="px-3 py-1 text-xs text-ink-500">{msg}</span>}
        </span>
      )}
    </span>
  );
}
