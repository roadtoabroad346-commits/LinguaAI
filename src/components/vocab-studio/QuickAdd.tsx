"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";

/**
 * Rapid card entry: type front + back, press Enter, the card is saved and
 * the form clears for the next one. Full editor stays available via "Add card".
 * Duplicates are reported inline (409) without losing the typed text.
 */
export function QuickAdd({ setId, onAdded }: { setId: string; onAdded: () => void }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(0);
  const [msg, setMsg] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const valid = front.trim().length > 0 && back.trim().length > 0;

  async function add() {
    if (!valid || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}/cards`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          front: front.trim(), back: back.trim(), word: front.trim().slice(0, 200),
          definition: back.trim(), source: "quick-add",
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not save the card.");
      setFront(""); setBack("");
      setAdded((n) => n + 1);
      setMsg({ tone: "success", text: `Saved “${front.trim().slice(0, 40)}”. Keep going — Enter adds another.` });
      onAdded();
      document.getElementById("quick-add-front")?.focus();
    } catch (e) {
      setMsg({ tone: "danger", text: e instanceof Error ? e.message : "Save failed. Your text is preserved — fix and retry." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-3xl border border-ink-200/70 bg-white p-4 shadow-card dark:border-ink-800 dark:bg-ink-900">
      <p className="text-sm font-bold">
        Quick add {added > 0 && <span role="status" className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">+{added} added</span>}
      </p>
      <form
        className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
        onSubmit={(e) => { e.preventDefault(); add(); }}
      >
        <Input id="quick-add-front" label="" aria-label="Quick add front (word)" placeholder="Front — e.g. ubiquitous" value={front} onChange={(e) => setFront(e.target.value)} autoComplete="off" maxLength={500} />
        <Input label="" aria-label="Quick add back (meaning)" placeholder="Back — e.g. found everywhere" value={back} onChange={(e) => setBack(e.target.value)} autoComplete="off" maxLength={2000} />
        <Button type="submit" disabled={!valid || busy} loading={busy} className="sm:h-12">Add</Button>
      </form>
      {msg && <Alert tone={msg.tone === "success" ? "success" : "danger"} title={msg.tone === "success" ? "Saved" : "Not saved"}>{msg.text}</Alert>}
      <p className="text-xs text-ink-400">Enter = add &amp; next · need example, synonyms or AI help? Use “Add card” for the full editor.</p>
    </div>
  );
}
