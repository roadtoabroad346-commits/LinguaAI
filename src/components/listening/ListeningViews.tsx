"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PartyPopper, Play, Pause, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress, Chip } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { SpeedMenu } from "@/components/learn/SpeedMenu";
import { PageTransition, Stagger, StaggerItem } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { LEVELS } from "@/lib/constants";
import { speak, stopSpeaking } from "@/lib/vocab/speak";
import type { ListeningTrack } from "@/lib/listening/library";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const KINDS = ["dialogue", "monologue", "podcast"] as const;

function kindLabel(t: (key: string) => string, kind: string): string {
  if (kind === "dialogue") return t("learn.kindDialogue");
  if (kind === "monologue") return t("learn.kindMonologue");
  if (kind === "podcast") return t("learn.kindPodcast");
  return kind;
}

export function ListeningList({ tracks }: { tracks: ListeningTrack[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tracks.filter((x) => {
      if (level !== "all" && x.level !== level) return false;
      if (kind !== "all" && x.kind !== kind) return false;
      if (needle && !x.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tracks, level, kind, query]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur dark:bg-ink-950/90">
        <Input aria-label={t("learn.searchTitles")} placeholder={t("learn.searchTitles")} value={query} onChange={(e) => setQuery(e.target.value)} className="shadow-card" />
        <div className="no-scrollbar -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
          {["all", ...LEVELS].map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? t("learn.all") : l}
            </Chip>
          ))}
          <span aria-hidden className="w-px shrink-0 bg-ink-200" />
          {["all", ...KINDS].map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? t("learn.all") : kindLabel(t, k)}
            </Chip>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: tracks.length })} {t("learn.tracksUnit")}</p>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
          action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); setKind("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <Stagger className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((track) => (
            <StaggerItem key={track.slug}>
              <Card interactive className="flex h-full min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{track.level}</Badge>
                  <Badge>{kindLabel(t, track.kind)}</Badge>
                  <Badge>{t("learn.minLabel", { count: track.minutes })}</Badge>
                </div>
                <CardTitle className="mt-2">{track.title}</CardTitle>
                <CardDescription className="line-clamp-2">{track.summary}</CardDescription>
                <div className="mt-3">
                  <Link href={`/listening/${track.slug}`}><Button size="sm" shine className="w-full sm:w-auto">{t("learn.listenPractice")}</Button></Link>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

interface PublicQ { id: string; prompt: string; choices: string[]; }

export function ListeningRunner({ slug, lines, vocabFocus, questions, dictationIndexes }: {
  slug: string;
  lines: Array<{ speaker: string; text: string }>;
  vocabFocus: string[];
  questions: PublicQ[];
  dictationIndexes: number[];
}) {
  const { t } = useTranslation();
  // Progressive reveal: listen FIRST, then unlock the transcript (retrieval before recognition).
  const [showTranscript, setShowTranscript] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playToken, setPlayToken] = useState(0);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [peek, setPeek] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dictIndex, setDictIndex] = useState(0);
  const [dictText, setDictText] = useState("");
  const [dictLoading, setDictLoading] = useState(false);
  const [dictResult, setDictResult] = useState<{ exact: boolean; similarity: number; xpEarned: number } | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);

  const fullText = useMemo(() => lines.map((l) => l.text).join(" "), [lines]);
  const answered = Object.keys(answers).length;

  function playAll() {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      setActiveLine(null);
      return;
    }
    const token = playToken + 1;
    setPlayToken(token);
    setPlaying(true);
    setActiveLine(0);
    try {
      // speak() uses the learner's saved playback speed (SpeedMenu below).
      speak(fullText);
    } finally {
      window.setTimeout(() => {
        setPlayToken((cur) => {
          if (cur === token) {
            setPlaying(false);
            setActiveLine(null);
          }
          return cur;
        });
      }, Math.min(60000, fullText.length * 90));
    }
  }
  function playSentence(i: number) {
    setActiveLine(i);
    const line = lines[i];
    if (line) speak(line.text);
    window.setTimeout(() => setActiveLine((a) => (a === i ? null : a)), 4000);
  }

  async function submitQuiz() {
    setSubmitting(true);
    setError(null);
    try {
      const selections = questions.map((x) => ({ questionId: x.id, selected: answers[x.id], choices: x.choices }));
      const res = await fetch("/api/listening/complete", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, selections }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.submitFailed"));
      setResult(json);
      if (json.perfect) celebrate({ big: true, force: true });
      else celebrate();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitDictation() {
    const lineIdx = dictationIndexes[dictIndex];
    if (lineIdx === undefined || !dictText.trim()) return;
    setDictLoading(true);
    setDictError(null);
    setDictResult(null);
    try {
      const res = await fetch("/api/listening/dictation", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, index: lineIdx, text: dictText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.dictationFailed"));
      setDictResult(json);
      if (json.exact) celebrate();
    } catch (e) {
      setDictError(e instanceof Error ? e.message : t("learn.couldNotCheck"));
    } finally {
      setDictLoading(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <Card className="relative">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle>{t("learn.listenTitle")}</CardTitle>
              <CardDescription>{t("learn.listenDesc")}</CardDescription>
            </div>
            <button
              onClick={playAll}
              aria-label={playing ? t("learn.stopPlayback") : t("learn.playFull")}
              className="bg-brand-gradient touch-44 flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white shadow-pop disabled:opacity-70"
            >
              {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SpeedMenu />
            <Button size="sm" variant="secondary" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? t("learn.hideTranscript") : t("learn.showTranscript")}
            </Button>
            {playing && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-700" role="status">
                <span aria-hidden className="flex h-4 items-end gap-[2px]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="w-[3px] origin-bottom animate-waveform rounded-full bg-current" style={{ height: "100%", animationDelay: `${i * 0.12}s` }} />
                  ))}
                </span>
                {t("learn.playing")}
              </span>
            )}
          </div>
          {showTranscript ? (
            <ol className="mt-3 space-y-2">
              {lines.map((l, i) => (
                <li
                  key={i}
                  className={cn(
                    "flex items-start justify-between gap-2 rounded-2xl border px-3 py-2.5 text-[15px] leading-relaxed transition-colors",
                    activeLine === i
                      ? "border-brand-400 bg-brand-50 dark:bg-brand-950"
                      : "border-transparent bg-ink-50 dark:bg-ink-800"
                  )}
                >
                  <p className="min-w-0"><span className="font-bold">{l.speaker}: </span>{l.text}</p>
                  <button
                    type="button"
                    onClick={() => playSentence(i)}
                    aria-label={t("learn.playLine", { n: i + 1 })}
                    className="touch-44 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-xs hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 rounded-2xl bg-ink-50 px-3 py-2.5 text-sm text-ink-500 dark:bg-ink-800">
              {t("learn.listenFirstHint")}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("learn.focusVocab")}>
            {vocabFocus.map((w) => (
              <button key={w} onClick={() => setPeek(w)}>
                <Badge tone="brand">{w}</Badge>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>{t("learn.dictation")}</CardTitle>
          <CardDescription>
            {t("learn.dictationDesc", { a: dictIndex + 1, b: dictationIndexes.length })}
          </CardDescription>
          {dictationIndexes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">{t("learn.noDictation")}</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => playSentence(dictationIndexes[dictIndex] ?? 0)}>
                  <Volume2 className="h-4 w-4" /> {t("learn.playSentence")}
                </Button>
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("learn.chooseSentence")}>
                  {dictationIndexes.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      role="tab"
                      aria-selected={dictIndex === i}
                      onClick={() => { setDictIndex(i); setDictText(""); setDictResult(null); setDictError(null); }}
                      className={cn(
                        "touch-44 h-10 w-10 rounded-2xl border text-sm font-bold transition-colors",
                        dictIndex === i ? "border-brand-600 bg-brand-50 text-brand-800 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-100" : "border-ink-200 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <label htmlFor="dictation-input" className="sr-only">{t("learn.typeSentence")}</label>
              <textarea
                id="dictation-input"
                rows={3}
                value={dictText}
                onChange={(e) => setDictText(e.target.value)}
                placeholder={t("learn.typeHearPlaceholder")}
                disabled={dictLoading}
                autoCapitalize="off"
                autoCorrect="off"
                enterKeyHint="done"
                className="min-h-[88px] w-full rounded-2xl border border-ink-200 bg-white p-4 text-base leading-relaxed focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-950"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button size="md" onClick={submitDictation} loading={dictLoading} disabled={!dictText.trim() || dictLoading} shine className="flex-1 sm:flex-none">
                  {t("learn.check")}
                </Button>
                {dictResult && (
                  <Badge tone={dictResult.exact ? "success" : "warning"}>
                    {dictResult.exact ? t("learn.exactMatch", { xp: dictResult.xpEarned }) : t("learn.similarity", { pct: Math.round(dictResult.similarity * 100) })}
                  </Badge>
                )}
              </div>
              {dictError && <Alert tone="danger" title={t("learn.dictationFailed")}>{dictError}</Alert>}
            </div>
          )}
        </Card>

        {result ? (
          <Card className="text-center">
            {result.perfect && (
              <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="bg-brand-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-pop">
                <PartyPopper className="h-7 w-7" />
              </motion.div>
            )}
            <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
              <CardTitle className="font-display text-xl">{result.perfect ? t("learn.perfectListening") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.goodListening") : t("learn.goodEffort")}</CardTitle>
              <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
            </div>
            <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
            <Progress value={(result.score / Math.max(1, result.total)) * 100} tone={result.perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="md" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
              <Link href="/listening"><Button size="md" variant="ghost">{t("learn.allTracks")}</Button></Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {questions.map((x, i) => (
                <Card key={x.id}>
                  <p className="text-[15px] font-bold leading-snug">{i + 1}. {x.prompt}</p>
                  <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t("placement.questionOf", { current: i + 1, total: questions.length })}>
                    {x.choices.map((c, ci) => (
                      <QuizOption
                        key={ci}
                        label={c}
                        prefix={String.fromCharCode(65 + ci)}
                        state={answers[x.id] === ci ? "selected" : "idle"}
                        checked={answers[x.id] === ci}
                        onSelect={() => setAnswers((a) => ({ ...a, [x.id]: ci }))}
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
            {error && <div className="mt-3"><Alert tone="danger" title={t("learn.submitFailed")}>{error}</Alert></div>}
            <StickyActionBar className="mt-4">
              <div className="min-w-0 flex-1 px-2 text-xs font-medium text-ink-500">
                {answered !== questions.length ? t("learn.answerAllHint") : t("learn.readyToSubmit")}
              </div>
              <Button onClick={submitQuiz} loading={submitting} disabled={answered !== questions.length || submitting} shine size="lg" className="flex-1">
                {t("learn.submitComprehension", { a: answered, b: questions.length })}
              </Button>
            </StickyActionBar>
          </>
        )}
        <Sheet open={peek !== null} onClose={() => setPeek(null)} title={peek ?? ""}>
          {peek && (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">Tap below to open the full word page.</p>
              <Link href={`/vocabulary/${peek}`}>
                <Button shine className="w-full">Open “{peek}” in vocabulary</Button>
              </Link>
            </div>
          )}
        </Sheet>
      </div>
    </PageTransition>
  );
}
