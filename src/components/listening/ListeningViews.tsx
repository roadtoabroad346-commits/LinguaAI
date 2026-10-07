"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEVELS } from "@/lib/constants";
import { speak } from "@/lib/vocab/speak";
import type { ListeningTrack } from "@/lib/listening/library";
import { useTranslation } from "@/lib/i18n/I18nProvider";

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
    return tracks.filter((t) => {
      if (level !== "all" && t.level !== level) return false;
      if (kind !== "all" && t.kind !== kind) return false;
      if (needle && !t.title.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [tracks, level, kind, query]);

  return (
    <div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_170px_170px]">
          <Input aria-label={t("learn.searchTitles")} placeholder={t("learn.searchTitles")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
            <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
              <option value="all">{t("learn.all")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.type")}</span>
            <select aria-label={t("learn.type")} value={kind} onChange={(e) => setKind(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
              <option value="all">{t("learn.all")}</option>
              {KINDS.map((k) => <option key={k} value={k}>{kindLabel(t, k)}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: tracks.length })} {t("learn.tracksUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
          action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); setKind("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((track) => (
            <Card key={track.slug} className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{track.level}</Badge>
                <Badge>{kindLabel(t, track.kind)}</Badge>
                <Badge>{t("learn.minLabel", { count: track.minutes })}</Badge>
              </div>
              <CardTitle className="mt-2">{track.title}</CardTitle>
              <CardDescription>{track.summary}</CardDescription>
              <div className="mt-3">
                <Link href={`/listening/${track.slug}`}><Button size="sm">{t("learn.listenPractice")}</Button></Link>
              </div>
            </Card>
          ))}
        </div>
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
  const [showTranscript, setShowTranscript] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Dictation state
  const [dictIndex, setDictIndex] = useState(0);
  const [dictText, setDictText] = useState("");
  const [dictLoading, setDictLoading] = useState(false);
  const [dictResult, setDictResult] = useState<{ exact: boolean; similarity: number; xpEarned: number } | null>(null);
  const [dictError, setDictError] = useState<string | null>(null);

  const fullText = useMemo(() => lines.map((l) => l.text).join(" "), [lines]);

  function playAll() {
    setPlaying(true);
    try {
      speak(fullText);
    } finally {
      window.setTimeout(() => setPlaying(false), Math.min(30000, fullText.length * 80));
    }
  }
  function playSentence(i: number) {
    const line = lines[i];
    if (line) speak(line.text);
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
    } catch (e) {
      setDictError(e instanceof Error ? e.message : t("learn.couldNotCheck"));
    } finally {
      setDictLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{t("learn.listenTitle")}</CardTitle>
            <CardDescription>{t("learn.listenDesc")}</CardDescription>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" onClick={playAll} disabled={playing}>{playing ? t("learn.playing") : t("learn.playFull")}</Button>
            <Button size="sm" variant="secondary" onClick={() => setShowTranscript((v) => !v)}>
              {showTranscript ? t("learn.hideTranscript") : t("learn.showTranscript")}
            </Button>
          </div>
        </div>
        {showTranscript && (
          <ol className="mt-3 space-y-2">
            {lines.map((l, i) => (
              <li key={i} className="flex items-start justify-between gap-2 rounded-xl bg-ink-50 px-3 py-2 text-sm">
                <p className="min-w-0"><span className="font-semibold">{l.speaker}: </span>{l.text}</p>
                <button type="button" onClick={() => playSentence(i)} aria-label={t("learn.playLine", { n: i + 1 })}
                  className="shrink-0 rounded-lg border border-ink-200 bg-white px-2 py-1 text-xs hover:bg-ink-100">▶</button>
              </li>
            ))}
          </ol>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5" aria-label={t("learn.focusVocab")}>
          {vocabFocus.map((w) => (
            <Link key={w} href={`/vocabulary/${w}`}><Badge tone="brand">{w}</Badge></Link>
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
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => playSentence(dictationIndexes[dictIndex] ?? 0)}>{t("learn.playSentence")}</Button>
              <div className="flex flex-wrap gap-1" role="tablist" aria-label={t("learn.chooseSentence")}>
                {dictationIndexes.map((_, i) => (
                  <button key={i} type="button" role="tab" aria-selected={dictIndex === i}
                    onClick={() => { setDictIndex(i); setDictText(""); setDictResult(null); setDictError(null); }}
                    className={`h-8 w-8 rounded-lg border text-xs font-semibold ${dictIndex === i ? "border-brand-600 bg-brand-50 text-brand-800" : "border-ink-200 hover:bg-ink-50"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <label htmlFor="dictation-input" className="sr-only">{t("learn.typeSentence")}</label>
            <textarea id="dictation-input" rows={2} value={dictText} onChange={(e) => setDictText(e.target.value)}
              placeholder={t("learn.typeHearPlaceholder")} disabled={dictLoading}
              className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={submitDictation} loading={dictLoading} disabled={!dictText.trim() || dictLoading}>{t("learn.check")}</Button>
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
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfectListening") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.goodListening") : t("learn.goodEffort")}</CardTitle>
            <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
          </div>
          <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
            <Link href="/listening"><Button size="sm" variant="ghost">{t("learn.allTracks")}</Button></Link>
          </div>
        </Card>
      ) : (
        <>
          {questions.map((x, i) => (
            <Card key={x.id}>
              <p className="text-sm font-semibold">{i + 1}. {x.prompt}</p>
              <div className="mt-2 grid gap-2" role="radiogroup" aria-label={t("placement.questionOf", { current: i + 1, total: questions.length })}>
                {x.choices.map((c, ci) => {
                  const selected = answers[x.id] === ci;
                  return (
                    <button key={ci} type="button" role="radio" aria-checked={selected}
                      onClick={() => setAnswers((a) => ({ ...a, [x.id]: ci }))}
                      className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-brand-600 bg-brand-50 font-medium" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50"}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
          {error && <Alert tone="danger" title={t("learn.submitFailed")}>{error}</Alert>}
          <Button onClick={submitQuiz} loading={submitting} disabled={Object.keys(answers).length !== questions.length || submitting}>
            {t("learn.submitComprehension", { a: Object.keys(answers).length, b: questions.length })}
          </Button>
        </>
      )}
    </div>
  );
}
