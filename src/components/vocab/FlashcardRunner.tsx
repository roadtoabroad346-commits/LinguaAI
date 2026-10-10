"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { Volume2, RotateCcw, ArrowLeft, ArrowRight, Star, Turtle, Shuffle, Check } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress, Chip } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { QuizOption } from "@/components/learn/QuizOption";
import { SpeedMenu } from "@/components/learn/SpeedMenu";
import { PageTransition } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { haptic } from "@/lib/motion/hooks";
import { speak } from "@/lib/vocab/speak";
import { SLOW_PLAYBACK_SPEED } from "@/lib/audio/speed";
import { BAND_LABEL, type MasteryBand } from "@/lib/vocab/mastery";
import {
  buildChoices,
  cardSides,
  gradeTyped,
  shuffleDeck,
  type FlashCard,
  type FlashDirection,
  type FlashMode,
} from "@/lib/vocab/flashcards";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { namespacedKey } from "@/lib/auth/storage";
import { cn } from "@/lib/utils";

interface CardItem extends FlashCard {
  band: MasteryBand;
  due?: boolean;
}

const MODE_KEY = "linguaai_flash_mode";
const DIR_KEY = "linguaai_flash_dir";
const SHUFFLE_KEY = "linguaai_flash_shuffle";
const FAV_KEY = "linguaai_flash_fav";

function readStorage(key: string): string | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function readFavs(key: string): Set<string> {
  try {
    const raw = typeof window === "undefined" ? null : window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

const MODES: FlashMode[] = ["flip", "write", "choice", "listen"];

export function FlashcardRunner() {
  const { t } = useTranslation();
  const { status, userId } = useAuth();
  // Favorites are per-account: namespaced by user id when signed in, guest key otherwise.
  const favKey = status === "authenticated" && userId ? namespacedKey(userId, "flash_fav") : FAV_KEY;
  const [allCards, setAllCards] = useState<CardItem[] | null>(null);
  const [signedIn, setSignedIn] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<FlashMode>("flip");
  const [direction, setDirection] = useState<FlashDirection>("word-def");
  const [shuffled, setShuffled] = useState(false);
  const [favOnly, setFavOnly] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [knownCount, setKnownCount] = useState(0);
  const [xpSum, setXpSum] = useState(0);
  const [exitX, setExitX] = useState(0);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const m = readStorage(MODE_KEY);
    if (m === "write" || m === "choice" || m === "listen" || m === "flip") setMode(m);
    const d = readStorage(DIR_KEY);
    if (d === "def-word" || d === "mixed" || d === "word-def") setDirection(d);
    setShuffled(readStorage(SHUFFLE_KEY) === "1");
    setFavs(readFavs(favKey));
    let cancelled = false;
    fetch("/api/flashcards")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setAllCards(json.cards ?? []);
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

  useEffect(() => {
    setFavs(readFavs(favKey));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favKey]);

  const cards = useMemo(() => {
    if (!allCards) return null;
    let list = allCards;
    if (favOnly) list = list.filter((c) => favs.has(c.slug));
    if (shuffled) list = shuffleDeck(list, new Date().toISOString().slice(0, 10));
    return list;
  }, [allCards, favOnly, favs, shuffled]);

  function persist(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Best-effort.
    }
  }

  function switchMode(next: FlashMode) {
    setMode(next);
    persist(MODE_KEY, next);
    resetSession();
  }

  function resetSession() {
    setIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setXpSum(0);
    setTyped("");
    setPicked(null);
    setRevealed(false);
    setError(null);
    setExitX(0);
  }

  function toggleFav(slug: string) {
    const key = favKey;
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      persist(key, JSON.stringify(Array.from(next)));
      return next;
    });
  }

  const review = useCallback(
    async (known: boolean) => {
      if (!cards || busy || index >= cards.length) return;
      const card = cards[index];
      setBusy(true);
      setError(null);
      setExitX(known ? 320 : -320);
      if (known) {
        setKnownCount((c) => c + 1);
        haptic([10, 30, 10]);
      } else {
        haptic(16);
      }
      const done = () =>
        window.setTimeout(() => {
          setFlipped(false);
          setTyped("");
          setPicked(null);
          setRevealed(false);
          setExitX(0);
          setIndex((i) => i + 1);
          setBusy(false);
        }, 180);
      if (!signedIn) {
        setXpSum((x) => x + (known ? 3 : 1));
        done();
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
        setAllCards((list) =>
          (list ?? []).map((c, i) =>
            cards[index] && c.slug === cards[index].slug
              ? { ...c, mastery: json.mastery, band: json.band }
              : c
          )
        );
        if (known && json.mastery >= 80) celebrate();
      } catch {
        setError(t("learn.reviewNotSavedDesc"));
        setXpSum((x) => x + (known ? 3 : 1));
      } finally {
        done();
      }
    },
    [cards, busy, index, signedIn, t]
  );

  // Keyboard shortcuts: Space flip, ← review, → known, 1–4 choose.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!cards || index >= cards.length) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "ArrowRight" && (mode === "flip" || revealed)) {
        e.preventDefault();
        review(true);
      } else if (e.key === "ArrowLeft" && (mode === "flip" || revealed)) {
        e.preventDefault();
        review(false);
      } else if ((e.key === " " || e.key === "Enter") && mode === "flip" && !typing) {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if ((mode === "choice" || mode === "listen") && ["1", "2", "3", "4"].includes(e.key) && !revealed && !typing) {
        setPicked(Number(e.key) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cards, index, mode, revealed, review]);

  // Auto-play the word when a listen-mode card appears.
  useEffect(() => {
    if (mode === "listen" && cards && index < cards.length) {
      const id = window.setTimeout(() => speak(cards[index].word), 350);
      return () => window.clearTimeout(id);
    }
  }, [mode, cards, index]);

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

  if ((allCards ?? []).length === 0) {
    return (
      <EmptyState
        title={t("learn.noFlashcards")}
        description={t("learn.noFlashcardsDesc")}
        action={<Link href="/vocabulary"><Button size="sm" shine>{t("learn.browseVocab")}</Button></Link>}
      />
    );
  }

  if (favOnly && cards.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3">
        <ModeBar
          mode={mode} onMode={switchMode} t={t}
          direction={direction} onDirection={(d) => { setDirection(d); persist(DIR_KEY, d); resetSession(); }}
          shuffled={shuffled} onShuffle={() => { setShuffled((v) => { persist(SHUFFLE_KEY, v ? "0" : "1"); return !v; }); resetSession(); }}
          favOnly={favOnly} onFavOnly={() => { setFavOnly(false); resetSession(); }}
          favCount={favs.size}
        />
        <EmptyState
          title={t("learn.noFavorites")}
          description={t("learn.noFavoritesDesc")}
          action={<Button size="sm" variant="secondary" onClick={() => { setFavOnly(false); resetSession(); }}>{t("learn.showAllCards")}</Button>}
        />
      </div>
    );
  }

  if (index >= cards.length) {
    const perfect = knownCount === cards.length;
    if (perfect) celebrate({ big: true });
    return (
      <PageTransition>
        <Card className="mx-auto w-full max-w-md text-center">
          <CardTitle className="font-display text-xl">{t("learn.deckComplete")}</CardTitle>
          <p className="font-display mt-2 text-4xl font-extrabold tabular-nums">
            {knownCount}<span className="text-lg text-ink-400">/{cards.length}</span>
          </p>
          <CardDescription>{signedIn ? t("learn.xpSaved", { xp: xpSum }) : t("learn.xpPreview", { xp: xpSum })}</CardDescription>
          <Progress value={(knownCount / Math.max(1, cards.length)) * 100} tone={perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="md" variant="secondary" onClick={resetSession}>
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
  const sides = cardSides(card, direction, index);
  const choices = mode === "choice" || mode === "listen" ? buildChoices(card, cards) : null;

  const bandLabel = (band: MasteryBand) =>
    band === "new" ? t("learn.bandNew")
    : band === "learning" ? t("learn.bandLearning")
    : band === "familiar" ? t("learn.bandFamiliar")
    : band === "mastered" ? t("learn.bandMastered")
    : BAND_LABEL[band] ?? band;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-md">
        <ModeBar
          mode={mode} onMode={switchMode} t={t}
          direction={direction} onDirection={(d) => { setDirection(d); persist(DIR_KEY, d); resetSession(); }}
          shuffled={shuffled} onShuffle={() => { setShuffled((v) => { persist(SHUFFLE_KEY, v ? "0" : "1"); return !v; }); resetSession(); }}
          favOnly={favOnly} onFavOnly={() => { setFavOnly((v) => !v); resetSession(); }}
          favCount={favs.size}
        />
        <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-500" role="status">
            {t("learn.cardOf", { a: index + 1, b: cards.length })}
            {mode === "flip" && <span className="hidden sm:inline"> · {t("learn.flipHint")}</span>}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <SpeedMenu compact />
            <IconButton
              label={favs.has(card.slug) ? t("learn.unstar") : t("learn.star")}
              onClick={() => toggleFav(card.slug)}
            >
              <Star className={cn("h-5 w-5", favs.has(card.slug) && "fill-amber-400 text-amber-400")} />
            </IconButton>
            <Badge tone="brand" className="shrink-0">{card.level}</Badge>
          </div>
        </div>
        <Progress value={(index / cards.length) * 100} className="mt-2" />

        {mode === "flip" && (
          <FlipCard
            card={card} sides={sides} flipped={flipped} onFlip={() => { haptic(6); setFlipped((f) => !f); }}
            onKnown={() => review(true)} onReview={() => review(false)}
            bandLabel={bandLabel(card.band)} t={t} exitX={exitX} index={index}
            disabled={busy}
          />
        )}

        {mode === "write" && (
          <Card className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{t("learn.modeWrite")}</p>
            <p className="mt-1 text-lg font-bold leading-snug">{card.definition}</p>
            <p className="mt-1 text-sm italic text-ink-500">“{card.example}”</p>
            {!revealed ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const ok = gradeTyped(card.word, typed);
                  setRevealed(true);
                  if (ok) haptic([10, 30, 10]);
                  else haptic(16);
                  window.setTimeout(() => review(ok), 900);
                }}
              >
                <Input
                  aria-label={t("learn.typeAnswer")}
                  placeholder={t("learn.typeAnswerPlaceholder")}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  className="flex-1"
                  autoComplete="off"
                />
                <Button type="submit" disabled={!typed.trim() || busy} shine>{t("learn.check")}</Button>
              </form>
            ) : (
              <div className="mt-3">
                <Alert
                  tone={gradeTyped(card.word, typed) ? "success" : "warning"}
                  title={gradeTyped(card.word, typed) ? t("learn.correctAnswer", { answer: card.word }) : t("learn.answerWas", { answer: card.word })}
                >
                  {card.phonetic} · {card.example}
                </Alert>
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => speak(card.word)}>
                    <Volume2 className="h-4 w-4" /> {t("learn.listen")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => speak(card.word, { rate: SLOW_PLAYBACK_SPEED })}>
                    <Turtle className="h-4 w-4" /> {t("learn.slow")}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {(mode === "choice" || mode === "listen") && choices && (
          <Card className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">
                {mode === "listen" ? t("learn.listenChoose") : t("learn.chooseMeaning")}
              </p>
              {mode === "listen" && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => speak(card.word)}>
                    <Volume2 className="h-4 w-4" /> {t("learn.playWord")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => speak(card.word, { rate: SLOW_PLAYBACK_SPEED })}>
                    <Turtle className="h-4 w-4" /> {t("learn.slow")}
                  </Button>
                </div>
              )}
            </div>
            <p className="font-display mt-1 text-3xl font-extrabold tracking-tight">
              {mode === "listen" ? "🔊" : card.word}
            </p>
            {mode === "choice" && <p className="mt-1 text-sm text-ink-500">{card.phonetic} · {card.partOfSpeech}</p>}
            <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t("learn.chooseMeaning")}>
              {choices.options.map((opt, i) => {
                const state = revealed
                  ? i === choices.answer ? "correct" : i === picked ? "wrong" : "idle"
                  : picked === i ? "selected" : "idle";
                return (
                  <QuizOption
                    key={i}
                    label={opt}
                    prefix={String.fromCharCode(65 + i)}
                    state={state}
                    checked={picked === i}
                    onSelect={() => {
                      if (revealed || busy) return;
                      setPicked(i);
                      setRevealed(true);
                      const ok = i === choices.answer;
                      if (ok) haptic([10, 30, 10]);
                      else haptic(16);
                      window.setTimeout(() => review(ok), 750);
                    }}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-400">{t("learn.keysHint")}</p>
          </Card>
        )}

        {mode === "flip" && (
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
        )}

        {error && <div className="mt-3"><Alert tone="warning" title={t("learn.reviewNotSaved")}>{error}</Alert></div>}
        {!signedIn && (
          <div className="mt-3"><Alert tone="brand" title={t("learn.previewDeck")}>{t("learn.previewDeckDesc")}</Alert></div>
        )}
      </div>
    </PageTransition>
  );
}

function ModeBar({ mode, onMode, t, direction, onDirection, shuffled, onShuffle, favOnly, onFavOnly, favCount }: {
  mode: FlashMode;
  onMode: (m: FlashMode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  direction: FlashDirection;
  onDirection: (d: FlashDirection) => void;
  shuffled: boolean;
  onShuffle: () => void;
  favOnly: boolean;
  onFavOnly: () => void;
  favCount: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("learn.studyMode")}>
        {MODES.map((m) => (
          <Chip key={m} active={mode === m} onClick={() => onMode(m)}>
            {m === "flip" ? t("learn.flashFlip") : m === "write" ? t("learn.flashWrite") : m === "choice" ? t("learn.flashChoice") : t("learn.flashListen")}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex gap-1.5" role="group" aria-label={t("learn.direction")}>
          {(["word-def", "def-word", "mixed"] as FlashDirection[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDirection(d)}
              aria-pressed={direction === d}
              className={cn(
                "rounded-xl border px-2.5 py-1.5 text-xs font-semibold",
                direction === d
                  ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                  : "border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
              )}
            >
              {d === "word-def" ? t("learn.dirWordDef") : d === "def-word" ? t("learn.dirDefWord") : t("learn.dirMixed")}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onShuffle}
          aria-pressed={shuffled}
          title={t("learn.shuffle")}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold",
            shuffled
              ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
              : "border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
          )}
        >
          <Shuffle className="h-3.5 w-3.5" /> {t("learn.shuffle")}
        </button>
        <button
          type="button"
          onClick={onFavOnly}
          aria-pressed={favOnly}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold",
            favOnly
              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200"
              : "border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
          )}
        >
          <Star className={cn("h-3.5 w-3.5", favOnly && "fill-amber-400 text-amber-400")} />
          {t("learn.starred")} ({favCount})
        </button>
      </div>
    </div>
  );
}

function FlipCard({ card, sides, flipped, onFlip, onKnown, onReview, bandLabel, t, exitX, index, disabled }: {
  card: CardItem;
  sides: { front: string; frontHint: string; back: string; backHint: string };
  flipped: boolean;
  onFlip: () => void;
  onKnown: () => void;
  onReview: () => void;
  bandLabel: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  exitX: number;
  index: number;
  disabled?: boolean;
}) {
  // Swipe position drives tilt + edge badges. Reset per card (key remounts anyway).
  const x = useMotionValue(0);
  const tilt = useTransform(x, [-280, 280], [-9, 9]);
  const knownOpacity = useTransform(x, [24, 110], [0, 1]);
  const reviewOpacity = useTransform(x, [-110, -24], [1, 0]);
  const badgeScale = useTransform(x, [0, 110, -110, 0], [0.9, 1, 1, 0.9]);
  const draggedFar = useRef(false);

  const SWIPE_OFFSET = 100;
  const SWIPE_VELOCITY = 550;

  function handleDrag(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    if (Math.abs(info.offset.x) > 12) draggedFar.current = true;
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const dx = info.offset.x;
    const vx = info.velocity.x;
    // Let the click-suppressor breathe, then allow taps again.
    const wasDrag = draggedFar.current;
    window.setTimeout(() => { draggedFar.current = false; }, 160);
    if (disabled) return;
    if (dx > SWIPE_OFFSET || vx > SWIPE_VELOCITY) {
      onKnown();
    } else if (dx < -SWIPE_OFFSET || vx < -SWIPE_VELOCITY) {
      onReview();
    } else if (!wasDrag) {
      // tiny movement = treated as tap elsewhere; nothing to do here
    }
  }

  function handleFlip() {
    // A real drag just ended — don't accidentally flip the card.
    if (draggedFar.current || Math.abs(x.get()) > 12 || disabled) return;
    onFlip();
  }

  const faceBase =
    "col-start-1 row-start-1 flex min-h-[320px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[1.75rem] border border-ink-200/70 bg-white p-6 text-center shadow-card dark:border-ink-700 dark:bg-ink-900";

  return (
    <div className="relative mt-3 select-none" style={{ perspective: 1400 }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={card.slug + "-" + index}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.55}
          dragMomentum={false}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          initial={{ opacity: 0, x: 36, rotate: 1.5 }}
          animate={{ opacity: 1, x: 0, rotate: 0 }}
          exit={{ opacity: 0, x: exitX || 0, transition: { duration: 0.17, ease: "easeIn" } }}
          transition={{ type: "spring", stiffness: 340, damping: 32 }}
          style={{ x, rotate: tilt, touchAction: "pan-y" }}
          className="relative cursor-grab touch-pan-y active:cursor-grabbing"
        >
          {/* Swipe badges — appear while dragging, never intercept taps */}
          <motion.div
            aria-hidden
            style={{ opacity: knownOpacity, scale: badgeScale }}
            className="pointer-events-none absolute -top-1 right-3 z-10 rotate-6 rounded-xl border-2 border-emerald-500 bg-emerald-500/15 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-300"
          >
            ✓ {t("learn.knowIt")}
          </motion.div>
          <motion.div
            aria-hidden
            style={{ opacity: reviewOpacity, scale: badgeScale }}
            className="pointer-events-none absolute -top-1 left-3 z-10 -rotate-6 rounded-xl border-2 border-rose-500 bg-rose-500/15 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-rose-600 dark:text-rose-300"
          >
            ✗ {t("learn.stillLearning")}
          </motion.div>

          {/* Flip layer: both faces stay mounted so mid-flip is never grey/empty */}
          <motion.div
            role="button"
            tabIndex={0}
            aria-label={flipped ? card.word : t("learn.revealDefinition")}
            onClick={handleFlip}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleFlip();
              }
            }}
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative grid w-full"
          >
            {/* FRONT */}
            <div
              aria-hidden={flipped}
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
              className={faceBase}
            >
              <span className="font-display text-4xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50">{sides.front}</span>
              <span className="text-sm text-ink-500 dark:text-ink-400">{sides.frontHint}</span>
              <span className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm">
                <button
                  type="button"
                  aria-label={t("learn.pronounce", { word: card.word })}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(card.word);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                >
                  <Volume2 className="h-4 w-4" /> {t("learn.listen")}
                </button>
                <button
                  type="button"
                  aria-label={t("learn.slow")}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(card.word, { rate: SLOW_PLAYBACK_SPEED });
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-ink-100 px-2.5 py-2 font-semibold text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                >
                  <Turtle className="h-4 w-4" />
                </button>
                <span className="text-xs text-ink-400">· {t("learn.tapReveal")}</span>
              </span>
              <span className="mt-1 flex items-center gap-1 text-xs font-medium text-ink-400">
                {bandLabel} · {card.mastery}% · <Check className="h-3 w-3" aria-hidden /> {t("learn.swipeHint")}
              </span>
            </div>

            {/* BACK (pre-rotated 180°, always mounted) */}
            <div
              aria-hidden={!flipped}
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              className={faceBase}
            >
              <span className="text-lg font-bold leading-snug text-ink-900 dark:text-ink-50">{sides.back}</span>
              <span className="text-sm italic leading-relaxed text-ink-500 dark:text-ink-400">“{sides.backHint}”</span>
              <span className="mt-1 text-xs text-ink-400">{t("learn.tapReveal")} — {t("learn.flipButtonsHint")}</span>
              <span className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t("learn.pronounce", { word: card.word })}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(card.word);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-200"
                >
                  <Volume2 className="h-4 w-4" /> {t("learn.listen")}
                </button>
              </span>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
