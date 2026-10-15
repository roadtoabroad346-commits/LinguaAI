"use client";

import { readJson } from "@/lib/api/response";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";
import { csvTemplate } from "@/lib/vocab-studio/csv";

export function ImportDialog({ setId, onDone }: { setId: string; onDone: (summary: unknown) => void }) {
  const [tab, setTab] = useState<"quick" | "csv" | "json">("quick");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"skip" | "update" | "import">("skip");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "danger" | "warning" | "brand"; title: string; body: string } | null>(null);
  const [details, setDetails] = useState<{ invalid: Array<{ index: number; errors: string[] }>; warnings: string[]; errors: Array<{ index: number; error: string }> } | null>(null);

  async function submit(format: string, payload: Record<string, unknown>) {
    setBusy(true); setMsg(null); setDetails(null);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}/import`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, mode, ...payload }),
      });
      const json = await readJson(res).catch(() => ({}));
      if (!res.ok) {
        setDetails({
          invalid: Array.isArray(json.invalid) ? json.invalid.slice(0, 10) : [],
          warnings: Array.isArray(json.warnings) ? json.warnings.slice(0, 5) : [],
          errors: [],
        });
        throw new Error(json.error || "Import failed");
      }
      const s = json.summary ?? { inserted: 0, updated: 0, skipped: 0 };
      const errCount = Array.isArray(s.errors) ? s.errors.length : 0;
      setMsg({
        tone: errCount > 0 && s.inserted === 0 && s.updated === 0 ? "warning" : "success",
        title: "Import complete",
        body: `Inserted ${s.inserted ?? 0}, updated ${s.updated ?? 0}, skipped ${s.skipped ?? 0}${errCount > 0 ? `, ${errCount} row error(s)` : ""}.`,
      });
      setDetails({
        invalid: Array.isArray(json.invalid) ? json.invalid.slice(0, 10) : [],
        warnings: Array.isArray(json.warnings) ? json.warnings.slice(0, 5) : [],
        errors: Array.isArray(s.errors) ? s.errors.slice(0, 10) : [],
      });
      setText("");
      onDone(json.summary);
    } catch (e) {
      setMsg({ tone: "danger", title: "Import failed", body: e instanceof Error ? e.message : "Unknown error." });
    } finally { setBusy(false); }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Import format">
        {(["quick", "csv", "json"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tab === t ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500"}`}>
            {t === "quick" ? "Quick paste" : t.toUpperCase()}
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs font-semibold">Duplicates
          <select aria-label="Duplicate handling" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)} className="h-9 rounded-xl border border-ink-200 bg-white px-2 dark:border-ink-700 dark:bg-ink-900">
            <option value="skip">Skip</option>
            <option value="update">Update</option>
            <option value="import">Import anyway</option>
          </select>
        </label>
      </div>

      {tab === "quick" && (
        <>
          <Textarea label="Paste vocabulary (one per line: front | back)" value={text} onChange={(e) => setText(e.target.value)} placeholder={"ubiquitous | found everywhere\nresilience | ability to recover"} rows={6} />
          <Button disabled={!text.trim() || busy} loading={busy} onClick={() => submit("quick", { text })}>Preview & import</Button>
        </>
      )}
      {tab === "csv" && (
        <>
          <Textarea label="Paste CSV (header row required)" value={text} onChange={(e) => setText(e.target.value)} placeholder="front,back,word,definition,example" rows={6} />
          <div className="flex flex-wrap gap-2">
            <Button disabled={!text.trim() || busy} loading={busy} onClick={() => submit("csv", { csv: text })}>Import CSV</Button>
            <Button variant="secondary" onClick={() => {
              const blob = new Blob([csvTemplate()], { type: "text/csv" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob); a.download = "vocab-template.csv"; a.click();
              URL.revokeObjectURL(a.href);
            }}>Download template</Button>
          </div>
        </>
      )}
      {tab === "json" && (
        <>
          <Textarea label='Paste JSON array: [{"front":"…","back":"…","word":"…"}]' value={text} onChange={(e) => setText(e.target.value)} placeholder='[{"front":"hello","back":"привет","word":"hello"}]' rows={6} />
          <Button disabled={!text.trim() || busy} loading={busy} onClick={() => {
            try {
              const rows = JSON.parse(text) as unknown;
              if (!Array.isArray(rows)) throw new Error("JSON must be an array.");
              submit("json", { rows });
            } catch (e) { setMsg({ tone: "danger", title: "Invalid JSON", body: e instanceof Error ? e.message : "Parse error." }); }
          }}>Import JSON</Button>
        </>
      )}
      {msg && <Alert tone={msg.tone} title={msg.title}>{msg.body}</Alert>}
      {details && (details.invalid.length > 0 || details.errors.length > 0 || details.warnings.length > 0) && (
        <div className="grid gap-1.5 rounded-2xl border border-ink-200 p-3 text-xs dark:border-ink-700" role="status" aria-label="Import details">
          {details.warnings.map((w, i) => <p key={`w${i}`} className="text-ink-500">⚠ {w}</p>)}
          {details.invalid.map((r) => <p key={`i${r.index}`} className="text-amber-700">Row {r.index}: skipped — {r.errors.join("; ")}</p>)}
          {details.errors.map((r) => <p key={`e${r.index}`} className="text-red-600">Row {r.index}: {r.error}</p>)}
        </div>
      )}
      <p className="text-xs text-ink-400">Max 500 rows / 1 MB per import. Quoted CSV fields, escaped commas and malformed rows are validated before saving.</p>
    </div>
  );
}
