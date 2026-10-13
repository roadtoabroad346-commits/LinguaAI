"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Shuffle, Volume2, RotateCcw, Keyboard } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, Chip, EmptyState, Progress } from "@/components/ui/feedback";
import { QuizOption } from "@/components/learn/QuizOption";
import { speak } from "@/lib/vocab/speak";
import { normaliseTyped } from "@/lib/vocab/flashcards";
import { cn } from "@/lib/utils";

type Mode = "flip" | "recall" | "choice" | "typing" | "matching";
type Queue = "due" | "all" | "difficult" | "new";

interface SCard extends Record<string, unknown> {
  id: string; front: string; back: string; word: string;
  definition: string; example: string; mastery: number; status: string;
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function StudyRunner({ setId }: { setId: string }) {
  const [queue, setQueue] = useState<Queue>("due");
  const [mode, setMode] = useState<Mode>("flip");
  const [cards, setCards] = useState<SCard[] | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; rating: string; correct: boolean }>>([]);
  const [xp, setXp] = useState(0);
  const [matchPicked, setMatchPicked] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [matchTries, setMatchTries] = useState(0);
  const [matchHits, setMatchHits] = useState(0);

  const load = useCallback(async (q: Queue) => {
    setError(null); setCards(null); setIndex(0); setResults([]); setXp(0);
    setFlipped(false); setTyped(""); setPicked(null); setRevealed(false);
    setMatched(new Set()); setMatchPicked(null);
    try {
      const res = await fetch(`/api/vocab-sets/${setId}/study?mode=${q}&limit=100`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load queue.");
      setTitle(String(json.set?.title ?? ""));
      setCards(json.cards ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "Load failed."); }
  }, [setId]);

  useEffect(() => { load(queue); }, [load, queue]);

  const deck = useMemo(() => {
    if (!cards) return null;
    if (!shuffled) return cards;
    const arr = [...cards];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [cards, shuffled]);

  async function grade(rating: "again" | "hard" | "good" | "easy") {
    if (!deck || busy || index >= deck.length) return;
    const card = deck[index];
    const key = uuid();
    setBusy(true);
    // optimistic advance
    const correct = rating !== "again";
    setResults((r) => [...r, { id: card.id, rating, correct }]);
    setXp((x) => x + (rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4));
    const advance = () => {
      setIndex((i) => i + 1); setFlipped(false); setTyped("");
      setPicked(null); setRevealed(false); setBusy(false);
    };
    const t = window.setTimeout(advance, mode === "flip" ? 150 : 600);
    try {
      const res = await fetch("/api/vocab-reviews", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, rating, idempotencyKey: key }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Review failed");
      if (json.deduped) {
        // Server deduped this review: undo the optimistic XP/counters.
        const expected = rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4;
        setXp((x) => x - expected);
        setResults((r) => r.slice(0, -1));
        return;
      }
      if (typeof json.xpAwarded === "number") {
        const expected = rating === "again" ? 1 : rating === "hard" ? 2 : rating === "good" ? 3 : 4;
        if (json.xpAwarded !== expected) setXp((x) => x - expected + json.xpAwarded);
      }
    } catch {
      setError("Review saved locally — sync failed. It will retry on the next card.");
      window.clearTimeout(t);
      setBusy(false);
    }
  }

  // Keyboard: Space flip, arrows navigate/grade, 1-4 choice
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!deck || index >= deck.length) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " && (mode === "flip" || mode === "recall")) { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight" && mode === "flip" && flipped) grade("good");
      else if (e.key === "ArrowLeft" && mode === "flip" && flipped) grade("again");
      else if ((mode === "choice") && ["1", "2", "3", "4"].includes(e.key) && !revealed) setPicked(Number(e.key) - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, index, mode, flipped, revealed, busy]);

  const currentCard: SCard | null = deck && index < deck.length ? deck[index] : null;
  const choices = useMemo(() => {
    if (!deck || !currentCard) return null;
    const pool = deck.filter((c) => c.id !== currentCard.id).map((c) => String(c.back || c.definition || c.word)).filter((d) => d && d !== currentCard.back);
    const distractors: string[] = [];
    for (const d of pool) { if (!distractors.includes(d)) distractors.push(d); if (distractors.length === 3) break; }
    while (distractors.length < 3) distractors.push(`(review: ${currentCard.word})`);
    const answer = distractors.length % 4;
    const options = [...distractors];
    options.splice(answer, 0, String(currentCard.back));
    return { options: options.slice(0, 4), answer };
  }, [deck, currentCard]);

  if (error && !deck) {
    return <Card><Alert tone="danger" title="Could not load study queue">{error}</Alert>
      <div className="mt-3 flex gap-2"><Button variant="secondary" onClick={() => load(queue)}>Retry</Button><Link href={`/vocab-sets/${setId}`}><Button variant="ghost">Back to set</Button></Link></div></Card>;
  }
  if (!deck) return <div aria-busy="true" aria-label="Loading queue"><div className="h-56 animate-pulse rounded-3xl bg-ink-100 dark:bg-ink-800" /></div>;
  if (deck.length === 0) {
    return <EmptyState title={queue === "due" ? "Nothing due 🎉" : "No cards in this queue"}
      description={queue === "due" ? "All cards are scheduled for later. Try the full deck or add new cards." : "Switch queue or add cards."}
      action={<div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => setQueue("all")}>Study all</Button>
        <Link href={`/vocab-sets/${setId}`}><Button size="sm" variant="ghost">Back to set</Button></Link>
      </div>} />;
  }

  // Session summary
  if ((mode !== "matching" && index >= deck.length) || (mode === "matching" && matched.size >= Math.min(8, deck.length) * 2)) {
    const correct = results.filter((r) => r.correct).length;
    const acc = results.length ? Math.round((correct / results.length) * 100) : (matchTries ? Math.round((matchHits / Math.max(1, matchTries)) * 100) : 0);
    return (
      <Card className="mx-auto w-full max-w-md text-center">
        <CardTitle>Session complete 🎉</CardTitle>
        <p className="mt-2 text-4xl font-extrabold tabular-nums">{correct}<span className="text-lg text-ink-400">/{results.length || matchTries}</span></p>
        <CardDescription>{acc}% recall · +{xp} XP saved{mode === "matching" ? ` · matching ${matchHits}/${matchTries}` : ""}</CardDescription>
        <Progress value={results.length ? (correct / Math.max(1, results.length)) * 100 : acc} tone={acc >= 80 ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
        <div className="mt-3 grid gap-1.5 text-left">
          {results.slice(-8).map((r, i) => (
            <p key={i} className="text-xs text-ink-500">{r.correct ? "✓" : "✗"} {r.rating}</p>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={() => { setIndex(0); setResults([]); setXp(0); setMatched(new Set()); }}><RotateCcw className="h-4 w-4" /> Again</Button>
          <Link href={`/vocab-sets/${setId}`}><Button variant="ghost">Back to set</Button></Link>
          <Link href="/flashcards"><Button variant="ghost">Library</Button></Link>
        </div>
      </Card>
    );
  }

  const card = currentCard;
  if (!card) {
    return <EmptyState title="No card" description="Queue is empty." action={<Link href={`/vocab-sets/${setId}`}><Button size="sm">Back</Button></Link>} />;
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Study mode">
        {(["flip", "recall", "choice", "typing", "matching"] as Mode[]).map((m) => (
          <Chip key={m} active={mode === m} onClick={() => { setMode(m); setIndex(0); setResults([]); setFlipped(false); setPicked(null); setRevealed(false); setTyped(""); setMatched(new Set()); }}>
            {m === "flip" ? "Flashcards" : m === "recall" ? "Active recall" : m === "choice" ? "Choice" : m === "typing" ? "Typing" : "Matching"}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {(["due", "all", "difficult", "new"] as Queue[]).map((qq) => (
          <button key={qq} onClick={() => setQueue(qq)} aria-pressed={queue === qq}
            className={cn("rounded-xl border px-2.5 py-1.5 text-xs font-semibold", queue === qq ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500")}>
            {qq === "due" ? "Quick review (due)" : qq === "all" ? "All" : qq === "difficult" ? "Difficult" : "New"}
          </button>
        ))}
        <button onClick={() => setShuffled((v) => !v)} aria-pressed={shuffled} className={cn("inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold", shuffled ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-500")}>
          <Shuffle className="h-3.5 w-3.5" /> Shuffle
        </button>
      </div>

      <p className="mt-2 truncate text-sm text-ink-500" role="status">{title} · {mode === "matching" ? `${matched.size / 2}/${Math.min(8, deck.length)} pairs` : `${index + 1}/${deck.length}`} · <Keyboard className="inline h-3.5 w-3.5" /> Space flip · ←/→ grade</p>
      <Progress value={mode === "matching" ? (matched.size / (Math.min(8, deck.length) * 2)) * 100 : (index / deck.length) * 100} className="mt-2" />

      {mode === "matching" ? (
        <MatchingBoard deck={deck} matched={matched} setMatched={setMatched} matchPicked={matchPicked}
          setMatchPicked={setMatchPicked} matchTries={matchTries} setMatchTries={setMatchTries}
          matchHits={matchHits} setMatchHits={setMatchHits} />
      ) : mode === "flip" ? (
        <Card className="mt-3 select-none">
          <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? "Hide answer" : "Reveal answer"}
            className="flex min-h-64 w-full flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center focus-visible:outline-2">
            {!flipped ? (
              <><span className="text-4xl font-extrabold">{card.front}</span>
                <span className="text-sm text-ink-500">{card.phonetic ? String(card.phonetic) : "Tap to reveal"}</span></>
            ) : (
              <><span className="text-xl font-bold">{card.back}</span>
                {card.example ? <span className="text-sm italic text-ink-500">“{card.example}”</span> : null}</>
            )}
          </button>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="secondary" size="lg" className="flex-1" disabled={!flipped || busy} onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <button aria-label="Listen" onClick={() => speak(card.word || card.front)} className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-ink-200"><Volume2 className="h-5 w-5" /></button>
            {!flipped ? (
              <Button size="lg" className="flex-1" onClick={() => setFlipped(true)}>Reveal</Button>
            ) : (
              <div className="flex flex-1 gap-1.5">
                <Button variant="secondary" size="lg" className="flex-1" disabled={busy} onClick={() => grade("again")}>Again</Button>
                <Button size="lg" className="flex-1" disabled={busy} onClick={() => grade("good")}>Known <ArrowRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        </Card>
      ) : mode === "recall" ? (
        <Card className="mt-3">
          <p className="text-xs font-bold uppercase text-ink-400">Think first — then reveal</p>
          <p className="mt-1 text-3xl font-extrabold">{card.front}</p>
          {!flipped ? (
            <Button className="mt-3 w-full" size="lg" onClick={() => setFlipped(true)}>Reveal answer</Button>
          ) : (
            <>
              <div className="mt-2 rounded-2xl bg-ink-50 p-3 dark:bg-ink-800">
                <p className="font-bold">{card.back}</p>
                {card.example ? <p className="text-sm italic text-ink-500">“{card.example}”</p> : null}
              </div>
              <p className="mt-2 text-xs font-semibold text-ink-500">How well did you recall it?</p>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {(["again", "hard", "good", "easy"] as const).map((r) => (
                  <Button key={r} size="sm" variant={r === "again" ? "danger" : r === "easy" ? "primary" : "secondary"} disabled={busy} onClick={() => grade(r)}>
                    {r === "again" ? "Again" : r === "hard" ? "Hard" : r === "good" ? "Good" : "Easy"}
                  </Button>
                ))}
              </div>
            </>
          )}
        </Card>
      ) : mode === "choice" && choices ? (
        <Card className="mt-3">
          <p className="text-xs font-bold uppercase text-ink-400">Choose the meaning</p>
          <p className="mt-1 text-3xl font-extrabold">{card.front}</p>
          <div className="mt-3 grid gap-2" role="radiogroup" aria-label="Choose meaning">
            {choices.options.map((opt, i) => {
              const state = revealed ? (i === choices.answer ? "correct" : i === picked ? "wrong" : "idle") : picked === i ? "selected" : "idle";
              return <QuizOption key={i} label={opt} prefix={String.fromCharCode(65 + i)} state={state} checked={picked === i}
                onSelect={() => {
                  if (revealed || busy) return;
                  setPicked(i); setRevealed(true);
                  const ok = i === choices.answer;
                  window.setTimeout(() => grade(ok ? "good" : "again"), 700);
                }} />;
            })}
          </div>
          {revealed && <p className="mt-2 text-sm text-ink-500">{card.example ? `Example: “${card.example}”` : `Answer: ${card.back}`}</p>}
        </Card>
      ) : (
        <Card className="mt-3">
          <p className="text-xs font-bold uppercase text-ink-400">Type the answer</p>
          <p className="mt-1 text-lg font-bold">{card.back}</p>
          {card.example ? <p className="mt-1 text-sm italic text-ink-500">“{card.example}”</p> : null}
          {!revealed ? (
            <form className="mt-3 flex gap-2" onSubmit={(e) => {
              e.preventDefault();
              const ok = normaliseTyped(card.word || card.front) === normaliseTyped(typed) && typed.trim().length > 0;
              setRevealed(true);
              window.setTimeout(() => grade(ok ? "good" : ok === false && normaliseTyped(typed).length > 0 && (card.word || card.front).toLowerCase().startsWith(normaliseTyped(typed).slice(0, 2)) ? "hard" : "again"), 900);
            }}>
              <Input aria-label="Type your answer" placeholder="Type the word…" value={typed} onChange={(e) => setTyped(e.target.value)} className="flex-1" autoComplete="off" />
              <Button type="submit" disabled={!typed.trim() || busy}>Check</Button>
            </form>
          ) : (
            <Alert tone={normaliseTyped(card.word || card.front) === normaliseTyped(typed) ? "success" : "warning"}
              title={normaliseTyped(card.word || card.front) === normaliseTyped(typed) ? `Correct: ${card.word}` : `Answer: ${card.word} (you typed “${typed}”)`}>
              {card.definition || card.back} · Check spelling, articles and plurals — small typos fail, capitalization does not.
            </Alert>
          )}
        </Card>
      )}

      {error && <div className="mt-3"><Alert tone="warning" title="Sync note">{error}</Alert></div>}
      <div className="mt-3 flex gap-2">
        <Link href={`/vocab-sets/${setId}`}><Button size="sm" variant="ghost">Back to set</Button></Link>
      </div>
    </div>
  );
}

function MatchingBoard({ deck, matched, setMatched, matchPicked, setMatchPicked, matchTries, setMatchTries, matchHits, setMatchHits }: {
  deck: SCard[]; matched: Set<string>; setMatched: (s: Set<string>) => void;
  matchPicked: string | null; setMatchPicked: (s: string | null) => void;
  matchTries: number; setMatchTries: (n: number | ((v: number) => number)) => void;
  matchHits: number; setMatchHits: (n: number | ((v: number) => number)) => void;
}) {
  const pairs = useMemo(() => deck.slice(0, 8), [deck]);
  const tiles = useMemo(() => {
    const t: Array<{ key: string; label: string; pair: string }> = [];
    pairs.forEach((c) => {
      t.push({ key: `w-${c.id}`, label: c.front, pair: c.id });
      t.push({ key: `d-${c.id}`, label: String(c.back).slice(0, 60), pair: c.id });
    });
    // deterministic-ish shuffle per deck
    return [...t].sort((a, b) => (a.key < b.key ? -1 : 1)).reverse().sort(() => Math.random() - 0.5);
  }, [pairs]);

  function tap(tile: { key: string; pair: string }) {
    if (matched.has(tile.key)) return;
    if (!matchPicked) { setMatchPicked(tile.key); return; }
    if (matchPicked === tile.key) { setMatchPicked(null); return; }
    const prevPair = tiles.find((t) => t.key === matchPicked)?.pair;
    setMatchTries((v: number) => v + 1);
    if (prevPair === tile.pair) {
      setMatched(new Set(Array.from(matched).concat([matchPicked, tile.key])));
      setMatchHits((v: number) => v + 1);
    }
    setMatchPicked(null);
  }

  return (
    <Card className="mt-3">
      <p className="text-xs font-bold uppercase text-ink-400">Match words ↔ meanings ({matchHits}/{matchTries} correct)</p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Matching tiles">
        {tiles.map((t) => {
          const done = matched.has(t.key);
          const active = matchPicked === t.key;
          return (
            <button key={t.key} disabled={done} onClick={() => tap(t)} aria-pressed={active}
              className={cn("min-h-16 rounded-2xl border p-3 text-sm font-semibold touch-44",
                done ? "border-emerald-300 bg-emerald-50 text-emerald-800 opacity-60" :
                active ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 bg-white")}>
              {t.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-400">Keyboard: Tab to a tile, Enter to select. Accuracy is tracked.</p>
    </Card>
  );
}
