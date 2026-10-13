"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";

export interface CardForm {
  front: string; back: string; word: string; definition: string;
  example: string; exampleTranslation: string; partOfSpeech: string;
  level: string; phonetic: string; synonyms: string; antonyms: string;
  collocations: string; grammarNotes: string; personalNotes: string;
  tags: string; source: string;
}

export function emptyForm(): CardForm {
  return {
    front: "", back: "", word: "", definition: "", example: "",
    exampleTranslation: "", partOfSpeech: "", level: "", phonetic: "",
    synonyms: "", antonyms: "", collocations: "", grammarNotes: "",
    personalNotes: "", tags: "", source: "custom",
  };
}

export function fromRow(r: Record<string, unknown>): CardForm {
  const arr = (v: unknown) => Array.isArray(v) ? (v as string[]).join("|") : "";
  return {
    front: String(r.front ?? ""), back: String(r.back ?? ""),
    word: String(r.word ?? ""), definition: String(r.definition ?? ""),
    example: String(r.example ?? ""), exampleTranslation: String(r.example_translation ?? ""),
    partOfSpeech: String(r.part_of_speech ?? ""), level: String(r.level ?? ""),
    phonetic: String(r.phonetic ?? ""), synonyms: arr(r.synonyms),
    antonyms: arr(r.antonyms), collocations: arr(r.collocations),
    grammarNotes: String(r.grammar_notes ?? ""), personalNotes: String(r.personal_notes ?? ""),
    tags: arr(r.tags), source: String(r.source ?? "custom"),
  };
}

export function toPayload(f: CardForm): Record<string, unknown> {
  const split = (s: string) => s.split(/[|;]/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
  return {
    front: f.front.trim(), back: f.back.trim() || f.definition.trim(),
    word: (f.word.trim() || f.front.trim()).slice(0, 200),
    definition: f.definition.trim(), example: f.example.trim(),
    exampleTranslation: f.exampleTranslation.trim(),
    partOfSpeech: f.partOfSpeech || null, level: f.level || null,
    phonetic: f.phonetic.trim(), synonyms: split(f.synonyms),
    antonyms: split(f.antonyms), collocations: split(f.collocations),
    grammarNotes: f.grammarNotes.trim(), personalNotes: f.personalNotes.trim(),
    tags: split(f.tags), source: f.source.trim() || "custom",
  };
}

export function CardEditor({ initial, saving, error, aiEnabled, onSave, onCancel }: {
  initial: CardForm;
  saving: boolean;
  error: string | null;
  aiEnabled: boolean;
  onSave: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState<CardForm>(initial);
  const [dirty, setDirty] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);
  const set = (k: keyof CardForm, v: string) => { setF((p) => ({ ...p, [k]: v })); setDirty(true); };

  useEffect(() => {
    const onBefore = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (f.front.trim() && (f.back.trim() || f.definition.trim())) onSave(toPayload(f));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [f, onSave]);

  async function aiFill() {
    const word = (f.word.trim() || f.front.trim());
    if (!word) { setAiMsg("Enter a word first."); return; }
    setAiBusy(true); setAiMsg(null);
    try {
      const res = await fetch("/api/vocab-studio/ai-assist", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ word }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "AI unavailable");
      const s = json.suggestion;
      setF((p) => ({
        ...p,
        definition: p.definition || String(s.definition ?? ""),
        example: p.example || String(s.example ?? ""),
        synonyms: p.synonyms || (s.synonyms ?? []).join("|"),
        antonyms: p.antonyms || (s.antonyms ?? []).join("|"),
        collocations: p.collocations || (s.collocations ?? []).join("|"),
        level: p.level || String(s.cefrEstimate ?? ""),
      }));
      setDirty(true);
      setAiMsg("AI suggestion applied — review before saving. Nothing was overwritten.");
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : "AI failed.");
    } finally { setAiBusy(false); }
  }

  const valid = f.front.trim().length > 0 && (f.back.trim().length > 0 || f.definition.trim().length > 0);

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => { e.preventDefault(); if (valid && !saving) { onSave(toPayload(f)); setDirty(false); } }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Front * (word shown first)" value={f.front} onChange={(e) => { set("front", e.target.value); if (!f.word) setF((p) => ({ ...p, word: e.target.value })); }} placeholder="e.g. ubiquitous" autoComplete="off" />
        <Input label="Target word / phrase *" value={f.word} onChange={(e) => set("word", e.target.value)} placeholder="ubiquitous" autoComplete="off" />
      </div>
      <Textarea label="Back * (definition or translation)" value={f.back} onChange={(e) => set("back", e.target.value)} placeholder="found everywhere" rows={2} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Definition" value={f.definition} onChange={(e) => set("definition", e.target.value)} placeholder="found everywhere" />
        <Input label="Phonetic" value={f.phonetic} onChange={(e) => set("phonetic", e.target.value)} placeholder="/juːˈbɪkwɪtəs/" />
      </div>
      <Textarea label="Example sentence" value={f.example} onChange={(e) => set("example", e.target.value)} placeholder="Phones are ubiquitous in modern schools." rows={2} />
      <Input label="Example translation" value={f.exampleTranslation} onChange={(e) => set("exampleTranslation", e.target.value)} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="grid gap-1 text-sm font-semibold">Part of speech
          <select aria-label="Part of speech" value={f.partOfSpeech} onChange={(e) => set("partOfSpeech", e.target.value)} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
            <option value="">—</option>
            {["noun", "verb", "adjective", "adverb", "phrase", "idiom", "phrasal-verb", "collocation", "expression", "other"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">CEFR
          <select aria-label="CEFR level" value={f.level} onChange={(e) => set("level", e.target.value)} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
            <option value="">—</option>
            {["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <Input label="Tags (| separated)" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="travel|daily" />
        <Input label="Source" value={f.source} onChange={(e) => set("source", e.target.value)} />
      </div>
      <details className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
        <summary className="cursor-pointer text-sm font-semibold">Advanced (synonyms, collocations, notes)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Input label="Synonyms (|)" value={f.synonyms} onChange={(e) => set("synonyms", e.target.value)} />
          <Input label="Antonyms (|)" value={f.antonyms} onChange={(e) => set("antonyms", e.target.value)} />
          <Input label="Collocations (|)" value={f.collocations} onChange={(e) => set("collocations", e.target.value)} />
          <Input label="Grammar notes" value={f.grammarNotes} onChange={(e) => set("grammarNotes", e.target.value)} />
        </div>
        <div className="mt-3"><Textarea label="Personal notes (never overwritten by AI)" value={f.personalNotes} onChange={(e) => set("personalNotes", e.target.value)} rows={2} /></div>
      </details>
      {aiMsg && <Alert tone="brand" title="AI assist">{aiMsg}</Alert>}
      {error && <Alert tone="danger" title="Could not save">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!valid || saving} loading={saving} className="min-w-32">Save card</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="ghost" onClick={aiFill} disabled={!aiEnabled || aiBusy}>
          {aiBusy ? "Asking AI…" : aiEnabled ? "✨ AI fill (review first)" : "AI unavailable"}
        </Button>
      </div>
      <p className="text-xs text-ink-400">Ctrl/⌘+Enter to save · AI never overwrites your text without review.</p>
    </form>
  );
}
