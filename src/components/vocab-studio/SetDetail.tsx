"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Plus, Search, Copy, Trash2, Pencil, Download } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { CardEditor, emptyForm, fromRow, type CardForm } from "./CardEditor";
import { ImportDialog } from "./ImportDialog";
import { QuickAdd } from "./QuickAdd";

interface Row extends Record<string, unknown> { id: string; front: string; back: string; word: string; mastery: number; status: string; }

export function SetDetail({ setId }: { setId: string }) {
  const [set, setSet] = useState<Record<string, unknown> | null>(null);
  const [cards, setCards] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [meta, setMeta] = useState({ title: "", description: "", category: "general", level: "", color: "brand" });
  const [showAdd, setShowAdd] = useState(false);
  const [editCard, setEditCard] = useState<Row | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [confirmCard, setConfirmCard] = useState<Row | null>(null);
  const [aiEnabled, setAiEnabled] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load set.");
      setSet(json.set);
      setCards(json.cards ?? []);
      const s = json.set as Record<string, unknown>;
      setMeta({
        title: String(s.title ?? ""), description: String(s.description ?? ""),
        category: String(s.category ?? "general"), level: String(s.level ?? ""),
        color: String(s.color ?? "brand"),
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Load failed."); }
  }, [setId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/vocab-studio/ai-assist").then((r) => r.json()).then((j) => setAiEnabled(Boolean(j.configured))).catch(() => {}); }, []);

  async function saveMeta() {
    setSaving(true);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: meta.title, description: meta.description, category: meta.category, level: meta.level || null, color: meta.color }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed.");
      setSet(json.set); setEditingMeta(false); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function saveCard(payload: Record<string, unknown>, id?: string) {
    setSaving(true); setSaveErr(null);
    try {
      const url = id ? `/api/vocab-sets/${setId}/cards/${id}` : `/api/vocab-sets/${setId}/cards`;
      const res = await fetch(url, { method: id ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed.");
      setShowAdd(false); setEditCard(null); await load();
    } catch (e) { setSaveErr(e instanceof Error ? e.message : "Save failed."); }
    finally { setSaving(false); }
  }

  async function duplicateCard(id: string) {
    const res = await fetch(`/api/vocab-sets/${setId}/cards/${id}`, { method: "POST" });
    if (!res.ok) { const j = await res.json(); setError(j.error || "Duplicate failed."); return; }
    await load();
  }

  async function deleteCard(id: string) {
    const res = await fetch(`/api/vocab-sets/${setId}/cards/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await res.json(); setError(j.error || "Delete failed."); return; }
    setConfirmCard(null); await load();
  }

  const filtered = (cards ?? []).filter((c) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return [c.front, c.back, c.word, String(c.definition ?? "")].some((v) => String(v).toLowerCase().includes(needle));
  });

  if (error && !set) return <Card><Alert tone="danger" title="Could not load set">{error} <Link href="/flashcards" className="underline">Back to library</Link></Alert></Card>;
  if (!set || !cards) return <div className="grid gap-2" aria-busy="true" aria-label="Loading set"><div className="h-32 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" /><div className="h-64 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" /></div>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/flashcards"><Button size="sm" variant="secondary"><ArrowLeft className="h-4 w-4" /> Library</Button></Link>
        <h1 className="min-w-0 flex-1 truncate text-2xl font-bold">{String(set.title)}</h1>
        {set.level ? <Badge tone="brand">{String(set.level)}</Badge> : null}
        <Badge>{cards.length} cards</Badge>
        <Link href={`/vocab-sets/${setId}/study`}><Button size="sm"><Play className="h-4 w-4" /> Study</Button></Link>
      </div>

      <Card>
        {!editingMeta ? (
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle>About this set</CardTitle>
              <p className="mt-1 text-sm text-ink-500">{String(set.description || "No description yet.")}</p>
              <p className="mt-1 text-xs text-ink-400">{String(set.category ?? "general")} · {String(set.language ?? "en")}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setEditingMeta(true)}><Pencil className="h-3.5 w-3.5" /> Edit set</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowImport(true)}>Import</Button>
            <a href={`/api/vocab-sets/${setId}/export?format=csv`}><Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /> CSV</Button></a>
            <a href={`/api/vocab-sets/${setId}/export?format=json`}><Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /> JSON</Button></a>
          </div>
        ) : (
          <div className="grid gap-3">
            <Input label="Title *" value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} maxLength={120} />
            <Textarea label="Description" value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Category" value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} />
              <label className="grid gap-1 text-sm font-semibold">Level
                <select value={meta.level} onChange={(e) => setMeta({ ...meta, level: e.target.value })} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
                  <option value="">Mixed</option>{["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-semibold">Color
                <select value={meta.color} onChange={(e) => setMeta({ ...meta, color: e.target.value })} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
                  {["brand", "emerald", "amber", "rose", "violet", "sky", "slate"].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveMeta} disabled={!meta.title.trim() || saving} loading={saving}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => setEditingMeta(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input label="" aria-label="Search cards" placeholder="Search cards…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={() => { setSaveErr(null); setShowAdd(true); }}><Plus className="h-4 w-4" /> Add card</Button>
      </Card>

      <QuickAdd setId={setId} onAdded={() => load()} />

      {filtered.length === 0 ? (
        <EmptyState title={cards.length === 0 ? "No cards yet" : "No matches"}
          description={cards.length === 0 ? "Add your first card or import a list." : "Try a different search."}
          action={cards.length === 0 ? <Button size="sm" onClick={() => setShowAdd(true)}>Add card</Button> : undefined} />
      ) : (
        <ul className="grid gap-2" aria-label="Cards">
          {filtered.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{c.front}</p>
                  <p className="truncate text-sm text-ink-500">{c.back}</p>
                  <p className="mt-1 flex flex-wrap gap-1 text-xs text-ink-400">
                    <span>{c.word}</span>·<span>{c.status}</span>·<span className="tabular-nums">{c.mastery}%</span>
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button aria-label={`Edit ${c.word}`} onClick={() => { setSaveErr(null); setEditCard(c); }} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700"><Pencil className="h-4 w-4" /></button>
                  <button aria-label={`Duplicate ${c.word}`} onClick={() => duplicateCard(c.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700"><Copy className="h-4 w-4" /></button>
                  <button aria-label={`Delete ${c.word}`} onClick={() => setConfirmCard(c)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add card" className="max-w-2xl">
        <CardEditor initial={emptyForm()} saving={saving} error={saveErr} aiEnabled={aiEnabled}
          onSave={(p) => saveCard(p)} onCancel={() => setShowAdd(false)} />
      </Modal>

      <Modal open={Boolean(editCard)} onClose={() => setEditCard(null)} title="Edit card" className="max-w-2xl">
        {editCard && (
          <CardEditor initial={fromRow(editCard as unknown as Record<string, unknown>)} saving={saving} error={saveErr} aiEnabled={aiEnabled}
            onSave={(p) => saveCard(p, editCard.id)} onCancel={() => setEditCard(null)} />
        )}
      </Modal>

      <Modal open={showImport} onClose={() => setShowImport(false)} title="Import vocabulary" className="max-w-2xl">
        <ImportDialog setId={setId} onDone={() => load()} />
      </Modal>

      <Modal open={Boolean(confirmCard)} onClose={() => setConfirmCard(null)} title="Delete card?">
        <p className="text-sm">Delete <strong>{confirmCard?.front}</strong>? This cannot be undone.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={() => confirmCard && deleteCard(confirmCard.id)}>Delete</Button>
          <Button variant="secondary" onClick={() => setConfirmCard(null)}>Keep</Button>
        </div>
      </Modal>
    </div>
  );
}

export type { CardForm };
export { emptyForm as __empty };
