"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { Badge } from "@/components/ui/feedback";
import { speak } from "@/lib/vocab/speak";
import { SaveWordButton } from "./SaveWordButton";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { haptic } from "@/lib/motion/hooks";
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
    <motion.article
      whileTap={{ scale: 0.99 }}
      className="flex flex-col rounded-3xl border border-ink-200/70 bg-white p-4 shadow-card transition-colors hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/vocabulary/${word.slug}`} className="font-display text-base font-bold text-ink-900 hover:text-brand-700 dark:text-ink-50">
            {word.word}
          </Link>
          <p className="truncate text-xs text-ink-500">{word.phonetic} · {word.partOfSpeech}</p>
        </div>
        <Badge tone="brand" className="shrink-0">{word.level}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-700 dark:text-ink-200">{word.definition}</p>
      <p className="mt-1 line-clamp-2 text-xs italic leading-relaxed text-ink-500">“{word.example}”</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              haptic(6);
              speak(word.word);
            }}
            aria-label={t("learn.pronounce", { word: word.word })}
            className="touch-44 group flex h-10 items-center gap-1.5 rounded-2xl bg-brand-50 px-3 text-brand-700 dark:bg-brand-950 dark:text-brand-200"
          >
            <Volume2 className="h-4 w-4" />
            <span aria-hidden className="flex h-4 items-end gap-[2px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-[3px] origin-bottom animate-waveform rounded-full bg-current"
                  style={{ height: "100%", animationDelay: `${i * 0.14}s` }}
                />
              ))}
            </span>
          </button>
          {mastery !== null && <Badge tone={masteryTone(mastery)} className="tabular-nums">{mastery}%</Badge>}
        </div>
        <SaveWordButton word={word.slug} initialSaved={saved} signedIn={signedIn} />
      </div>
    </motion.article>
  );
}
