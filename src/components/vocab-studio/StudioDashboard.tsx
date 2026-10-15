"use client";

import { readJson } from "@/lib/api/response";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, Star, Archive, Play, Copy, Trash2, Pencil, BarChart3 } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert, Badge, Chip, EmptyState, Progress } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

interface StudioSet {
  id: string; title: string; description: string; level: string | null;
  category: string; color: string; icon: string;
  is_archived: boolean; is_favorite: boolean;
  cardCount: number; dueCount: number; masteredCount: number; avgMastery: number;
  lastStudiedAt: string | null; updated_at: string;
}

const COLOR_BG: Record<string, string> = {
  brand: "from-brand-600 to-violet-600", emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500", rose: "from-rose-500 to-pink-500",
  violet: "from-violet-500 to-purple-500", sky: "from-sky-500 to-cyan-500",
  slate: "from-slate-500 to-gray-600",
};

export function StudioDashboard() {
  const [sets, setSets] = useState<StudioSet[] | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("active");
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("general");
  const [color, setColor] = useState("brand");
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StudioSet | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sRes, stRes] = await Promise.all([
        fetch(`/api/vocab-sets?sort=${sort}&filter=${filter}&q=${encodeURIComponent(q)}`),
        fetch("/api/vocab-studio/stats"),
      ]);
      const sj = await readJson(sRes).catch(() => ({}));
      if (!sRes.ok) {
        if (sj.code === "needs_migration") { setNeedsMigration(true); setSets([]); return; }
        throw new Error(sj.error || "Could not load your sets.");
      }
      setNeedsMigration(false);
      setSets(sj.sets ?? []);
      if (stRes.ok) { const st = await readJson(stRes); setStats(st.stats ?? null); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    }
  }, [sort, filter, q]);

  useEffect(() => { load(); }, [load]);

  async function create() {
    if (!title.trim() || busy) return;
    setBusy(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/vocab-sets", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim(),
          level: level || null, category: category.trim() || "general", color,
        }),
      });
      const json = await readJson(res).catch(() => ({}));
      if (!res.ok) {
        if (json.code === "needs_migration") { setNeedsMigration(true); setCreating(false); await load(); return; }
        throw new Error(json.error || "Create failed.");
      }
      // Success: reset the form and open the new set so cards can be added right away.
      const newId = (json.set as { id?: string } | undefined)?.id;
      setTitle(""); setDescription(""); setLevel(""); setCategory("general"); setColor("brand");
      setCreating(false);
      if (newId) window.location.href = `/vocab-sets/${newId}`;
      else await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Create failed.");
    } finally { setBusy(false); }
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/vocab-sets/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { const j = await readJson(res); throw new Error(j.error || "Update failed."); }
    await load();
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/vocab-sets/${id}/duplicate`, { method: "POST" });
    if (!res.ok) { const j = await readJson(res); throw new Error(j.error || "Duplicate failed."); }
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/vocab-sets/${id}`, { method: "DELETE" });
    if (!res.ok) { const j = await readJson(res); throw new Error(j.error || "Delete failed."); }
    setConfirmDelete(null);
    await load();
  }

  const s = (stats ?? {}) as Record<string, number>;

  return (
    <div className="grid gap-4">
      {/* Analytics strip — real persisted data only */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" role="list" aria-label="Vocabulary statistics">
        {[
          ["Total cards", s.totalCards ?? 0], ["Due today", s.dueToday ?? 0],
          ["Learning", (s.learningCards ?? 0)], ["Mastered", s.masteredCards ?? 0],
          ["7d accuracy", s.accuracy7d != null ? `${s.accuracy7d}%` : "—"],
          ["7d reviews", s.reviews7d ?? 0],
        ].map(([label, v]) => (
          <Card key={label as string} className="p-3 text-center" role="listitem">
            <p className="text-2xl font-extrabold tabular-nums">{String(v)}</p>
            <p className="text-xs text-ink-500">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input label="" aria-label="Search sets" placeholder="Search sets…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["active", "all", "favorite", "archived"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs font-semibold">Sort
          <select aria-label="Sort sets" value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-xl border border-ink-200 bg-white px-2 dark:border-ink-700 dark:bg-ink-900">
            <option value="recent">Recent</option><option value="name">Name</option>
            <option value="cards">Cards</option><option value="studied">Studied</option>
          </select>
        </label>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New set</Button>
        <Link href="/flashcards?view=classic" className="text-xs font-semibold text-brand-700">Classic flashcards →</Link>
      </Card>

      {needsMigration && (
        <Alert tone="brand" title="Vocabulary Sets storage is being prepared">
          Your personal sets need a one-time database update before they can load.
          Please apply the pending database migration, then press Retry — nothing you do here can break existing data.
          <div className="mt-2"><button className="font-semibold underline" onClick={load}>Retry</button></div>
        </Alert>
      )}
      {error && !needsMigration && <Alert tone="danger" title="Something went wrong">{error} <button className="underline" onClick={load}>Retry</button></Alert>}

      {sets === null ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading sets">
          {[0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" />)}
        </div>
      ) : sets.length === 0 ? (
        <EmptyState title={filter === "archived" ? "No archived sets" : "No vocabulary sets yet"}
          description="Create your first collection — e.g. Travel phrases, Business collocations, Idioms."
          action={<Button size="sm" onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> Create set</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((st) => (
            <Card key={st.id} interactive className="flex flex-col gap-2 p-4">
              <div className={cn("flex items-center gap-2 rounded-2xl bg-gradient-to-br p-3 text-white", COLOR_BG[st.color] ?? COLOR_BG.brand)}>
                <span className="text-lg" aria-hidden>{st.is_favorite ? "★" : "▦"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{st.title}</p>
                  <p className="truncate text-xs text-white/85">{st.cardCount} cards · {st.dueCount} due · {st.avgMastery}%</p>
                </div>
                {st.level && <Badge tone="default">{st.level}</Badge>}
              </div>
              {st.description && <p className="line-clamp-2 text-sm text-ink-500">{st.description}</p>}
              <Progress value={st.cardCount ? (st.masteredCount / st.cardCount) * 100 : 0} label={`${st.masteredCount}/${st.cardCount} mastered`} />
              <p className="text-xs text-ink-400">
                {st.lastStudiedAt ? `Studied ${new Date(st.lastStudiedAt).toLocaleDateString()}` : "Not studied yet"} · {st.category}
              </p>
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Link href={`/vocab-sets/${st.id}/study`}><Button size="sm"><Play className="h-3.5 w-3.5" /> Study</Button></Link>
                <Link href={`/vocab-sets/${st.id}`}><Button size="sm" variant="secondary"><Pencil className="h-3.5 w-3.5" /> Edit</Button></Link>
                <button aria-label={st.is_favorite ? "Unfavorite" : "Favorite"} onClick={() => patch(st.id, { isFavorite: !st.is_favorite }).catch((e) => setError(e.message))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700">
                  <Star className={cn("h-4 w-4", st.is_favorite && "fill-amber-400 text-amber-400")} />
                </button>
                <button aria-label={st.is_archived ? "Restore" : "Archive"} onClick={() => patch(st.id, { isArchived: !st.is_archived }).catch((e) => setError(e.message))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700">
                  <Archive className="h-4 w-4" />
                </button>
                <button aria-label="Duplicate set" onClick={() => duplicate(st.id).catch((e) => setError(e.message))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 dark:border-ink-700">
                  <Copy className="h-4 w-4" />
                </button>
                <button aria-label="Delete set" onClick={() => setConfirmDelete(st)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => { setCreating(false); setCreateError(null); }} title="New vocabulary set">
        <div className="grid gap-3" onKeyDown={(e) => { if (e.key === "Enter" && title.trim() && !busy) create(); }}>
          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Travel idioms" maxLength={120} autoFocus />
          <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this set for?" maxLength={1000} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-sm font-semibold">Level
              <select aria-label="Set level" value={level} onChange={(e) => setLevel(e.target.value)} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
                <option value="">Mixed</option>{["A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <Input label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" maxLength={64} />
            <label className="grid gap-1 text-sm font-semibold">Color
              <select aria-label="Set color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 rounded-2xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
                {["brand", "emerald", "amber", "rose", "violet", "sky", "slate"].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>
          {createError && <Alert tone="danger" title="Could not create the set">{createError}</Alert>}
          <div className="flex gap-2">
            <Button onClick={create} disabled={!title.trim() || busy} loading={busy}>Create & open set</Button>
            <Button variant="secondary" onClick={() => { setCreating(false); setCreateError(null); }}>Cancel</Button>
          </div>
          <p className="text-xs text-ink-400">After creating, you land in the set and can add cards right away.</p>
        </div>
      </Modal>

      <Modal open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)} title="Delete set?">
        <p className="text-sm">Delete <strong>{confirmDelete?.title}</strong> and all {confirmDelete?.cardCount} cards? This cannot be undone.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete.id).catch((e) => setError(e.message))}>Delete forever</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Keep</Button>
        </div>
      </Modal>

      <Card>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> How mastery works</CardTitle>
        <CardDescription>Mastered = mastery ≥ 80, ≥ 3 reviews, ≥ 75% accuracy. Viewing a card never counts — only graded recalls (Again / Hard / Good / Easy) move the schedule.</CardDescription>
      </Card>
    </div>
  );
}

export function useStudioSetsSnapshot() {
  const [sets, setSets] = useState<StudioSet[] | null>(null);
  useEffect(() => {
    fetch("/api/vocab-sets?filter=active").then((r) => readJson(r)).then((j) => setSets(j.sets ?? [])).catch(() => setSets([]));
  }, []);
  return sets;
}
