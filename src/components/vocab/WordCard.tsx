"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { speak } from "@/lib/vocab/speak";
import { SaveWordButton } from "./SaveWordButton";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { VocabWord } from "@/lib/vocab/bank";

export function masteryTone(mastery: number): "default" | "brand" | "success" | "warning" {
  if (mastery >= 80) return "success";
  if (mastery >= 40) return "brand";
  if (mastery > 0) return "warning";
  return "default";
}

export function WordCard({ word, saved, mastery, signedIn }: {
  word: VocabWord;
  saved: boolean;
  mastery: number | null;
  signedIn: boolean;
}) {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/vocabulary/${word.slug}`} className="text-base font-semibold text-ink-900 hover:text-brand-700">
            {word.word}
          </Link>
          <p className="text-xs text-ink-500">{word.phonetic} · {word.partOfSpeech}</p>
        </div>
        <Badge tone="brand">{word.level}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink-700">{word.definition}</p>
      <p className="mt-1 line-clamp-2 text-xs italic text-ink-500">“{word.example}”</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => speak(word.word)} aria-label={t("learn.pronounce", { word: word.word })}>🔊</Button>
          {mastery !== null && <Badge tone={masteryTone(mastery)}>{mastery}%</Badge>}
        </div>
        <SaveWordButton word={word.slug} initialSaved={saved} signedIn={signedIn} />
      </div>
    </article>
  );
}
