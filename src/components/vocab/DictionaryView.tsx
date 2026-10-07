"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { masteryBand, BAND_LABEL } from "@/lib/vocab/mastery";
import { speak } from "@/lib/vocab/speak";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export interface DictionaryEntry {
  word: string;
  mastery: number;
  definition: string | null;
  part_of_speech: string | null;
  level: string | null;
  phonetic: string | null;
  example: string | null;
  translation: string | null;
  next_review_at: string | null;
  created_at: string;
}

export function DictionaryView({ initialEntries, signedIn }: { initialEntries: DictionaryEntry[]; signedIn: boolean }) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState(initialEntries);
  const [q, setQ] = useState("");
  const [band, setBand] = useState("all");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState<"recent" | "mastery" | "alpha">("recent");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = entries.filter((e) => {
      if (band !== "all" && masteryBand(e.mastery) !== band) return false;
      if (level !== "all" && (e.level ?? "") !== level) return false;
      if (!needle) return true;
      return e.word.includes(needle) || (e.definition ?? "").toLowerCase().includes(needle);
    });
    return [...list].sort((a, b) => {
      if (sort === "mastery") return b.mastery - a.mastery;
      if (sort === "alpha") return a.word.localeCompare(b.word);
      return b.created_at.localeCompare(a.created_at);
    });
  }, [entries, q, band, level, sort]);

  const mastered = entries.filter((e) => e.mastery >= 80).length;
  const due = entries.filter((e) => !e.next_review_at || e.next_review_at <= new Date().toISOString().slice(0, 10)).length;

  async function remove(word: string) {
    setBusy(word);
    setError(null);
    try {
      const res = await fetch(`/api/dictionary?word=${encodeURIComponent(word)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove failed");
      setEntries((list) => list.filter((e) => e.word !== word));
    } catch {
      setError(t("learn.removeWordFail"));
    } finally {
      setBusy(null);
    }
  }

  const bandLabel = (band: string) =>
    band === "new" ? t("learn.bandNew")
    : band === "learning" ? t("learn.bandLearning")
    : band === "familiar" ? t("learn.bandFamiliar")
    : band === "mastered" ? t("learn.bandMastered")
    : BAND_LABEL[band as keyof typeof BAND_LABEL] ?? band;

  if (!signedIn) {
    return (
      <EmptyState
        title={t("learn.signinDictTitle")}
        description={t("learn.signinDictDesc")}
        action={<Link href="/login"><Button size="sm">{t("auth.loginCta")}</Button></Link>}
      />
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title={t("learn.emptyDictTitle")}
        description={t("learn.emptyDictDesc")}
        action={<Link href="/vocabulary"><Button size="sm">{t("learn.browseVocab")}</Button></Link>}
      />
    );
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardTitle>{entries.length}</CardTitle><CardDescription>{t("learn.savedWords")}</CardDescription></Card>
        <Card><CardTitle>{mastered}</CardTitle><CardDescription>{t("learn.masteredLabel")}</CardDescription></Card>
        <Card><CardTitle>{due}</CardTitle><CardDescription>{t("learn.dueReview")}</CardDescription></Card>
      </div>

      <Card className="mt-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <Input label={t("learn.searchDict")} placeholder={t("learn.searchDictPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          <div>
            <label htmlFor="dict-band" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.mastery")}</label>
            <select id="dict-band" value={band} onChange={(e) => setBand(e.target.value)} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm">
              <option value="all">{t("learn.all")}</option>
              <option value="new">{t("learn.bandNew")}</option>
              <option value="learning">{t("learn.bandLearning")}</option>
              <option value="familiar">{t("learn.bandFamiliar")}</option>
              <option value="mastered">{t("learn.bandMastered")}</option>
            </select>
          </div>
          <div>
            <label htmlFor="dict-level" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.level")}</label>
            <select id="dict-level" value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm">
              {["all", "A1", "A2", "B1", "B2", "C1"].map((l) => <option key={l} value={l}>{l === "all" ? t("learn.all") : l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dict-sort" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.sort")}</label>
            <select id="dict-sort" value={sort} onChange={(e) => setSort(e.target.value as never)} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm">
              <option value="recent">{t("learn.recent")}</option>
              <option value="mastery">{t("learn.mastery")}</option>
              <option value="alpha">{t("learn.alphaAZ")}</option>
            </select>
          </div>
        </div>
      </Card>

      {error && <div className="mt-3"><Alert tone="danger" title={t("common.somethingWrong")}>{error}</Alert></div>}

      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noWords")} description={t("learn.tryDifferent")} /></div>
      ) : (
        <div className="mt-4 space-y-3">
          {filtered.map((e) => (
            <Card key={e.word}>
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Link href={`/vocabulary/${e.word}`} className="font-semibold text-ink-900 hover:text-brand-700">{e.word}</Link>
                  {e.level && <Badge tone="brand">{e.level}</Badge>}
                  <Badge>{bandLabel(masteryBand(e.mastery))}</Badge>
                  <button type="button" onClick={() => speak(e.word)} className="text-sm" aria-label={t("learn.pronounce", { word: e.word })}>🔊</button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(e.word)} loading={busy === e.word} disabled={busy !== null} aria-label={t("learn.removeWord", { word: e.word })}>
                  {t("learn.unsave")}
                </Button>
              </div>
              {e.definition && <p className="mt-1 text-sm text-ink-700">{e.definition}</p>}
              {e.example && <p className="mt-1 text-xs italic text-ink-500">“{e.example}”</p>}
              {e.translation && <p className="mt-1 text-xs text-ink-600">🌐 {e.translation}</p>}
              <Progress value={e.mastery} label={t("learn.masteryLabel", { pct: e.mastery })} className="mt-2 max-w-sm" />
            </Card>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/flashcards"><Button size="sm">{t("learn.reviewFlashcards")}{due > 0 ? ` ${t("learn.dueCount", { count: due })}` : ""}</Button></Link>
        <Link href="/vocabulary/practice"><Button size="sm" variant="secondary">{t("modules.practiceQuiz")}</Button></Link>
      </div>
    </div>
  );
}
