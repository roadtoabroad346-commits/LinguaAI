"use client";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { searchWords, type VocabWord } from "@/lib/vocab/bank";
import { WordCard } from "./WordCard";
import { readLocalSaved } from "./SaveWordButton";
import type { Level } from "@/types/database";
import { useTranslation } from "@/lib/i18n/I18nProvider";

const LEVELS = ["all", "A1", "A2", "B1", "B2", "C1"] as const;
const POS = ["all", "noun", "verb", "adjective", "adverb"] as const;

interface SavedEntry {
  word: string;
  mastery: number;
}

export function VocabularyExplorer({ initialWords, savedEntries, signedIn, defaultLevel }: {
  initialWords: VocabWord[];
  savedEntries: SavedEntry[];
  signedIn: boolean;
  defaultLevel: Level | null;
}) {
  const [q, setQ] = useState("");
  const { t } = useTranslation();
  const [level, setLevel] = useState<string>(defaultLevel ?? "all");
  const [pos, setPos] = useState<string>("all");  const [saved, setSaved] = useState<Map<string, number>>(
    () => new Map(savedEntries.map((e) => [e.word, e.mastery]))
  );
  const [localTick, setLocalTick] = useState(0);

  // Signed-out learners keep saves in localStorage; re-read after toggles.
  useEffect(() => {
    if (signedIn) return;
    setSaved(new Map(readLocalSaved().map((w) => [w, 0])));
  }, [signedIn, localTick]);

  const results = useMemo(
    () => searchWords({ q, level: level as never, pos: pos as never }),
    [q, level, pos]
  );

  useEffect(() => {
    if (!signedIn) {
      const id = setInterval(() => setLocalTick((t) => t + 1), 1500);
      return () => clearInterval(id);
    }
  }, [signedIn]);

  return (
    <div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <Input
            label={t("learn.searchWords")}
            placeholder={t("learn.searchWordsPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div>
            <label htmlFor="vocab-level" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.level")}</label>
            <select id="vocab-level" value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm">
              {LEVELS.map((l) => <option key={l} value={l}>{l === "all" ? t("learn.allLevels") : l}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="vocab-pos" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.type")}</label>
            <select id="vocab-pos" value={pos} onChange={(e) => setPos(e.target.value)} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm">
              {POS.map((p) => <option key={p} value={p}>{p === "all" ? t("learn.allTypes") : p}</option>)}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">
          {t("learn.resultsOf", { shown: results.length, total: initialWords.length })} {t("learn.wordsUnit")}
          {!signedIn && ` · ${t("learn.previewSaves")}`}
        </p>
      </Card>

      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={t("learn.noWords")}
            description={t("learn.noWordsDesc")}
            action={<Button variant="secondary" size="sm" onClick={() => { setQ(""); setLevel("all"); setPos("all"); }}>{t("learn.clearFilters")}</Button>}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((w) => (
            <WordCard key={w.slug} word={w} saved={saved.has(w.slug)} mastery={saved.has(w.slug) ? saved.get(w.slug) ?? 0 : null} signedIn={signedIn} />
          ))}
        </div>
      )}

      {!signedIn && (
        <div className="mt-4">
          <Alert tone="brand" title={t("learn.signinMastery")}>
            {t("learn.signinMasteryDesc")}
          </Alert>
        </div>
      )}
    </div>
  );
}
