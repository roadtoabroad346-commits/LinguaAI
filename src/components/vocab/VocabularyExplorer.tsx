"use client";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/feedback";
import { Stagger, StaggerItem } from "@/lib/motion/components";
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
  const [pos, setPos] = useState<string>("all");
  const [saved, setSaved] = useState<Map<string, number>>(
    () => new Map(savedEntries.map((e) => [e.word, e.mastery]))
  );
  const [localTick, setLocalTick] = useState(0);

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
      const id = setInterval(() => setLocalTick((x) => x + 1), 1500);
      return () => clearInterval(id);
    }
  }, [signedIn]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur dark:bg-ink-950/90 md:top-16">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <Input
            label=""
            aria-label={t("learn.searchWords")}
            placeholder={t("learn.searchWordsPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-12 rounded-2xl pl-11 shadow-card"
          />
        </div>
        <div className="no-scrollbar -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("learn.level")}>
          {LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? t("learn.allLevels") : l}
            </Chip>
          ))}
          <span aria-hidden className="w-px shrink-0 bg-ink-200 dark:bg-ink-700" />
          {POS.map((p) => (
            <Chip key={p} active={pos === p} onClick={() => setPos(p)}>
              {p === "all" ? t("learn.allTypes") : p}
            </Chip>
          ))}
        </div>
      </div>

      <Card className="mt-3">
        <p className="text-xs font-medium text-ink-500" role="status">
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
        <Stagger className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((w) => (
            <StaggerItem key={w.slug}>
              <WordCard word={w} saved={saved.has(w.slug)} mastery={saved.has(w.slug) ? saved.get(w.slug) ?? 0 : null} signedIn={signedIn} />
            </StaggerItem>
          ))}
        </Stagger>
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
