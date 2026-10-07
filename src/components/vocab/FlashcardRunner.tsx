"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
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

  // Load-once effect: error text uses the mount-time locale (no refetch on language switch).
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
    // Load-once: no refetch on language switch (error text uses mount-time locale).
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
        <div className="mt-4 h-40 animate-pulse rounded-xl bg-ink-100" aria-hidden />
      </Card>
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        title={t("learn.noFlashcards")}
        description={t("learn.noFlashcardsDesc")}
        action={<Link href="/vocabulary"><Button size="sm">{t("learn.browseVocab")}</Button></Link>}
      />
    );
  }

  if (index >= cards.length) {
    return (
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("learn.deckComplete")}</CardTitle>
          <Badge tone="success" className="shrink-0">{t("learn.knownCount", { a: knownCount, b: cards.length })}</Badge>
        </div>
        <CardDescription>{signedIn ? t("learn.xpSaved", { xp: xpSum }) : t("learn.xpPreview", { xp: xpSum })}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("learn.reviewAgain")}</Button>
          <Link href="/vocabulary/practice"><Button size="sm">{t("learn.tryQuiz")}</Button></Link>
          <Link href="/dictionary"><Button size="sm" variant="ghost">{t("nav.dictionary")}</Button></Link>
        </div>
      </Card>
    );
  }

  const card = cards[index];

  async function review(known: boolean) {
    setBusy(true);
    setError(null);
    if (known) setKnownCount((c) => c + 1);
    if (!signedIn) {
      setXpSum((x) => x + (known ? 3 : 1));
      advance();
      setBusy(false);
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
    } catch {
      setError(t("learn.reviewNotSavedDesc"));
      setXpSum((x) => x + (known ? 3 : 1));
    } finally {
      advance();
      setBusy(false);
    }
  }

  function advance() {
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  const bandLabel = (band: MasteryBand) =>
    band === "new" ? t("learn.bandNew")
    : band === "learning" ? t("learn.bandLearning")
    : band === "familiar" ? t("learn.bandFamiliar")
    : band === "mastered" ? t("learn.bandMastered")
    : BAND_LABEL[band] ?? band;

  return (
    <div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm text-ink-500" role="status">{t("learn.cardOf", { a: index + 1, b: cards.length })}</p>
        <Badge tone="brand" className="shrink-0">{card.level}</Badge>
      </div>
      <Progress value={(index / cards.length) * 100} className="mt-2" />
      <Card className="mt-3 min-h-56">
        {!flipped ? (
          <div
            onClick={() => setFlipped(true)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setFlipped(true); }}
            role="button"
            tabIndex={0}
            aria-label={t("learn.revealDefinition")}
            className="flex min-h-48 w-full cursor-pointer flex-col items-center justify-center gap-2 text-center"
          >
            <span className="text-3xl font-bold">{card.word}</span>
            <span className="text-sm text-ink-500">{card.phonetic} · {card.partOfSpeech}</span>
            <span className="mt-2 inline-flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm text-ink-500">
              <span onClick={(e) => { e.stopPropagation(); speak(card.word); }} onKeyDown={(e) => e.stopPropagation()} role="button" tabIndex={0} aria-label={t("learn.pronounce", { word: card.word })} className="rounded-lg px-2 py-1 text-sm hover:bg-ink-100">🔊 {t("learn.listen")}</span>
              <span aria-hidden>·</span><span>{t("learn.tapReveal")}</span>
            </span>
            <span className="text-xs text-ink-400">{bandLabel(card.band)} · {card.mastery}%</span>
          </div>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
            <p className="text-lg font-semibold">{card.definition}</p>
            <p className="text-sm italic text-ink-500">“{card.example}”</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => review(false)} loading={busy} disabled={busy}>{t("learn.stillLearning")}</Button>
              <Button size="sm" onClick={() => review(true)} loading={busy} disabled={busy}>{t("learn.knowIt")}</Button>
            </div>
          </div>
        )}
      </Card>
      {error && <div className="mt-3"><Alert tone="warning" title={t("learn.reviewNotSaved")}>{error}</Alert></div>}
      {!signedIn && (
        <div className="mt-3"><Alert tone="brand" title={t("learn.previewDeck")}>{t("learn.previewDeckDesc")}</Alert></div>
      )}
    </div>
  );
}
