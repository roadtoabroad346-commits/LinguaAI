"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, RotateCcw, ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PageTransition } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { haptic } from "@/lib/motion/hooks";
import { speak } from "@/lib/vocab/speak";
import { BAND_LABEL, type MasteryBand } from "@/lib/vocab/mastery";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface CardItem {
  slug: string;
  word: string;
  partOfSpeech: string;
  level: string;
  definition: string;
  example: string;
  phonetic: string;
  mastery: number;
  band: MasteryBand;
  due?: boolean;
}

export function FlashcardRunner() {
  const { t } = useTranslation();
  const [cards, setCards] = useState<CardItem[] | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownCount, setKnownCount] = useState(0);
  const [xpSum, setXpSum] = useState(0);
  const [exitX, setExitX] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/flashcards")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setCards(json.cards ?? []);
        setSignedIn(json.signedIn !== false);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("learn.couldNotLoadDeck"));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadError) {
    return (
      <Card>
        <Alert tone="danger" title={t("learn.couldNotLoadTitle")}>{loadError}</Alert>
        <div className="mt-3"><Button variant="secondary" onClick={() => window.location.reload()}>{t("common.retry")}</Button></div>
      </Card>
    );
  }

  if (!cards) {
    return (
      <Card aria-busy="true" aria-label={t("learn.loadingDeckTitle")}>
        <CardTitle>{t("learn.loadingDeck")}</CardTitle>
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-44 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" />
          <div className="flex gap-2">
            <div className="h-11 flex-1 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
            <div className="h-11 flex-1 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
          </div>
        </div>
      </Card>
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        title={t("learn.noFlashcards")}
        description={t("learn.noFlashcardsDesc")}
        action={<Link href="/vocabulary"><Button size="sm" shine>{t("learn.browseVocab")}</Button></Link>}
      />
    );
  }

  if (index >= cards.length) {
    const perfect = knownCount === cards.length;
    if (perfect) celebrate({ big: true });
    return (
      <PageTransition>
        <Card className="text-center">
          <CardTitle className="font-display text-xl">{t("learn.deckComplete")}</CardTitle>
          <p className="font-display mt-2 text-4xl font-extrabold tabular-nums">
            {knownCount}<span className="text-lg text-ink-400">/{cards.length}</span>
          </p>
          <CardDescription>{signedIn ? t("learn.xpSaved", { xp: xpSum }) : t("learn.xpPreview", { xp: xpSum })}</CardDescription>
          <Progress value={(knownCount / Math.max(1, cards.length)) * 100} tone={perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="md" variant="secondary" onClick={() => window.location.reload()}>
              <RotateCcw className="h-4 w-4" /> {t("learn.reviewAgain")}
            </Button>
            <Link href="/vocabulary/practice"><Button size="md" shine>{t("learn.tryQuiz")}</Button></Link>
            <Link href="/dictionary"><Button size="md" variant="ghost">{t("nav.dictionary")}</Button></Link>
          </div>
        </Card>
      </PageTransition>
    );
  }

  const card = cards[index];

  async function review(known: boolean) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setExitX(known ? 320 : -320);
    if (known) {
      setKnownCount((c) => c + 1);
      haptic([10, 30, 10]);
    } else {
      haptic(16);
    }
    if (!signedIn) {
      setXpSum((x) => x + (known ? 3 : 1));
      window.setTimeout(() => {
        advance();
        setBusy(false);
      }, 180);
      return;
    }
    try {
      const res = await fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ word: card.slug, known }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "review failed");
      setXpSum((x) => x + (json.xpAwarded ?? 0));
      setCards((list) => (list ?? []).map((c, i) => (i === index ? { ...c, mastery: json.mastery, band: json.band } : c)));
      if (known && json.mastery >= 80) celebrate();
    } catch {
      setError(t("learn.reviewNotSavedDesc"));
      setXpSum((x) => x + (known ? 3 : 1));
    } finally {
      window.setTimeout(() => {
        advance();
        setBusy(false);
      }, 180);
    }
  }

  function advance() {
    setFlipped(false);
    setExitX(0);
    setIndex((i) => i + 1);
  }

  const bandLabel = (band: MasteryBand) =>
    band === "new" ? t("learn.bandNew")
    : band === "learning" ? t("learn.bandLearning")
    : band === "familiar" ? t("learn.bandFamiliar")
    : band === "mastered" ? t("learn.bandMastered")
    : BAND_LABEL[band] ?? band;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-md">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-500" role="status">
            {t("learn.cardOf", { a: index + 1, b: cards.length })} · swipe ← review · → known
          </p>
          <Badge tone="brand" className="shrink-0">{card.level}</Badge>
        </div>
        <Progress value={(index / cards.length) * 100} className="mt-2" />

        <div className="relative mt-3" style={{ perspective: 1200 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={card.slug + index}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={(_, info) => {
                if (!flipped && Math.abs(info.offset.x) > 90) {
                  review(info.offset.x > 0);
                }
              }}
              initial={{ opacity: 0, x: exitX || 60, rotate: 2 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={{ opacity: 0, x: exitX || 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="touch-pan-y"
            >
              <motion.button
                type="button"
                onClick={() => {
                  haptic(6);
                  setFlipped((f) => !f);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFlipped((f) => !f);
                  }
                }}
                aria-label={flipped ? card.word : t("learn.revealDefinition")}
                animate={{ rotateY: flipped ? 180 : 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                style={{ transformStyle: "preserve-3d" }}
                className="relative flex min-h-[300px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.75rem] border border-ink-200/70 bg-white p-6 text-center shadow-card dark:border-ink-700 dark:bg-ink-900"
              >
                {!flipped ? (
                  <span style={{ backfaceVisibility: "hidden" }} className="flex flex-col items-center gap-2">
                    <span className="font-display text-4xl font-extrabold tracking-tight">{card.word}</span>
                    <span className="text-sm text-ink-500">{card.phonetic} · {card.partOfSpeech}</span>
                    <span className="mt-2 flex items-center gap-2 text-sm">
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={t("learn.pronounce", { word: card.word })}
                        onClick={(e) => {
                          e.stopPropagation();
                          speak(card.word);
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                      >
                        <Volume2 className="h-4 w-4" /> {t("learn.listen")}
                      </span>
                      <span className="text-xs text-ink-400">· {t("learn.tapReveal")}</span>
                    </span>
                    <span className="mt-1 text-xs font-medium text-ink-400">{bandLabel(card.band)} · {card.mastery}%</span>
                  </span>
                ) : (
                  <span style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }} className="flex flex-col items-center gap-2">
                    <span className="text-lg font-bold leading-snug">{card.definition}</span>
                    <span className="text-sm italic leading-relaxed text-ink-500">“{card.example}”</span>
                    <span className="mt-1 text-xs text-ink-400">{t("learn.tapReveal")} — swipe or use buttons</span>
                  </span>
                )}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="glass-strong sticky bottom-24 z-20 mt-3 flex items-center gap-2 rounded-3xl border border-ink-200/70 p-2.5 shadow-sheet dark:border-ink-700 md:bottom-6">
          <Button variant="secondary" size="lg" onClick={() => review(false)} disabled={busy} className="flex-1">
            <ArrowLeft className="h-4 w-4" /> {t("learn.stillLearning")}
          </Button>
          <IconButton label={t("learn.listen")} onClick={() => speak(card.word)}>
            <Volume2 className="h-5 w-5" />
          </IconButton>
          <Button size="lg" onClick={() => review(true)} disabled={busy} shine className="flex-1">
            {t("learn.knowIt")} <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {error && <div className="mt-3"><Alert tone="warning" title={t("learn.reviewNotSaved")}>{error}</Alert></div>}
        {!signedIn && (
          <div className="mt-3"><Alert tone="brand" title={t("learn.previewDeck")}>{t("learn.previewDeckDesc")}</Alert></div>
        )}
      </div>
    </PageTransition>
  );
}
