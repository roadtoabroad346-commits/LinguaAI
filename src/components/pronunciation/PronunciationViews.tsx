"use client";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Play, Turtle, Mic, Square, Volume2, PartyPopper, RotateCcw } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress, Chip } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedMenu } from "@/components/learn/SpeedMenu";
import { PageTransition, Stagger, StaggerItem } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { LEVELS } from "@/lib/constants";
import { speak, stopSpeaking } from "@/lib/vocab/speak";
import { SLOW_PLAYBACK_SPEED } from "@/lib/audio/speed";
import { KIND_LABEL, type PronunciationDrill, type PronunciationKind } from "@/lib/pronunciation/drills";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const KINDS: PronunciationKind[] = ["minimal-pair", "word-stress", "sentence-stress", "linking", "intonation"];

export function PronunciationList({ drills }: { drills: PronunciationDrill[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return drills.filter((x) => {
      if (level !== "all" && x.level !== level) return false;
      if (kind !== "all" && x.kind !== kind) return false;
      if (needle && !(x.title + " " + x.focus).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [drills, level, kind, query]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur dark:bg-ink-950/90">
        <Input aria-label={t("learn.pronSearch")} placeholder={t("learn.pronSearch")} value={query} onChange={(e) => setQuery(e.target.value)} className="shadow-card" />
        <div className="no-scrollbar -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("learn.level")}>
          {["all", ...LEVELS].map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? t("learn.all") : l}
            </Chip>
          ))}
          <span aria-hidden className="w-px shrink-0 bg-ink-200" />
          {["all", ...KINDS].map((k) => (
            <Chip key={k} active={kind === k} onClick={() => setKind(k)}>
              {k === "all" ? t("learn.all") : KIND_LABEL[k as PronunciationKind]}
            </Chip>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-500" role="status">
        {t("learn.resultsOf", { shown: filtered.length, total: drills.length })} {t("learn.pronUnit")}
      </p>
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
            action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); setKind("all"); }}>{t("learn.clearFilters")}</Button>} />
        </div>
      ) : (
        <Stagger className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((x) => (
            <StaggerItem key={x.slug}>
              <Card interactive className="flex h-full min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{x.level}</Badge>
                  <Badge>{KIND_LABEL[x.kind]}</Badge>
                </div>
                <CardTitle className="mt-2">{x.title}</CardTitle>
                <CardDescription className="line-clamp-2">{x.focus}</CardDescription>
                <p className="mt-1 truncate font-mono text-xs text-ink-400">{x.ipa}</p>
                <div className="mt-3">
                  <Link href={`/pronunciation/${x.slug}`}><Button size="sm" shine className="w-full sm:w-auto">{t("learn.pronStart")}</Button></Link>
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

type RecState = "idle" | "recording" | "ready" | "unsupported";

export function PronunciationRunner({ drill }: { drill: PronunciationDrill }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; xpEarned: number; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rec, setRec] = useState<RecState>(
    () => (typeof window !== "undefined" && "MediaRecorder" in window ? "idle" : "unsupported")
  );
  const [recUrl, setRecUrl] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  function playLine(line: string, slow: boolean) {
    stopSpeaking();
    speak(line, slow ? { rate: SLOW_PLAYBACK_SPEED } : undefined);
  }

  async function toggleRecord() {
    if (rec === "recording") {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunks.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const url = URL.createObjectURL(new Blob(chunks.current, { type: mr.mimeType || "audio/webm" }));
        setRecUrl(url);
        setRec("ready");
      };
      recorder.current = mr;
      mr.start();
      setRec("recording");
    } catch {
      setRec("unsupported");
    }
  }

  async function submit() {
    if (rating === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/pronunciation/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: drill.slug, rating }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.submitFailed"));
      setResult(json);
      if (json.score >= 80) celebrate({ big: json.score >= 100 });
      else celebrate();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl space-y-3">
        <nav aria-label={t("learn.breadcrumb")} className="truncate text-xs text-ink-500">
          <Link href="/pronunciation" className="underline">{t("modules.pronunciationTitle")}</Link> / <span>{drill.title}</span>
        </nav>

        <Card className="relative overflow-hidden">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{drill.level}</Badge>
                <Badge>{KIND_LABEL[drill.kind]}</Badge>
              </div>
              <CardTitle className="mt-2">{drill.title}</CardTitle>
              <CardDescription>{drill.focus}</CardDescription>
            </div>
            <SpeedMenu />
          </div>
          <div className="mt-3 rounded-2xl bg-ink-50 p-4 text-center dark:bg-ink-800">
            <p className="font-display text-2xl font-extrabold tracking-tight">{drill.syllables}</p>
            <p className="mt-1 font-mono text-sm text-ink-500">{drill.ipa}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{t("learn.pronStressHint")}</p>
          </div>
          <Alert tone="brand" title={t("learn.pronTip")}><p>{drill.tip}</p></Alert>
          <div className="mt-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{t("learn.pronContrast")}</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {drill.examples.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => playLine(e, false)}
                    className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900"
                  >
                    🔊 {e}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card>
          <CardTitle>{t("learn.pronLines")}</CardTitle>
          <CardDescription>{t("learn.pronLinesDesc")}</CardDescription>
          <ol className="mt-3 space-y-2">
            {drill.practiceLines.map((line, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-2xl border border-transparent bg-ink-50 px-3 py-2.5 text-[15px] leading-relaxed dark:bg-ink-800">
                <p className="min-w-0">{line}</p>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => playLine(line, false)}
                    aria-label={t("learn.playLine", { n: i + 1 })}
                    className="touch-44 flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => playLine(line, true)}
                    aria-label={t("learn.pronSlowLine", { n: i + 1 })}
                    className="touch-44 flex h-9 w-9 items-center justify-center rounded-xl border border-ink-200 bg-white hover:bg-ink-100 dark:border-ink-700 dark:bg-ink-900"
                  >
                    <Turtle className="h-4 w-4" />
                  </button>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card>
          <CardTitle>{t("learn.pronRecord")}</CardTitle>
          <CardDescription>{t("learn.pronRecordDesc")}</CardDescription>
          {rec === "unsupported" ? (
            <div className="mt-3"><Alert tone="warning" title={t("learn.pronNoMicTitle")}>{t("learn.pronNoMic")}</Alert></div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="md" variant={rec === "recording" ? "danger" : "secondary"} onClick={toggleRecord}>
                {rec === "recording" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {rec === "recording" ? t("learn.pronStop") : t("learn.pronRecordBtn")}
              </Button>
              {rec === "recording" && (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-red-600" role="status">
                  <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  {t("learn.pronRecording")}
                </span>
              )}
              {recUrl && (
                <audio controls src={recUrl} className="h-10 w-full sm:w-auto" aria-label={t("learn.pronPlayback")} />
              )}
            </div>
          )}
        </Card>

        {result ? (
          <Card className="text-center">
            {result.score >= 80 && (
              <div className="bg-brand-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-pop">
                <PartyPopper className="h-7 w-7" />
              </div>
            )}
            <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
              <CardTitle className="font-display text-xl">{t("learn.pronDone")}</CardTitle>
              <Badge tone={result.score >= 60 ? "success" : "warning"}>{result.score}/100</Badge>
            </div>
            <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
            <Progress value={result.score} tone={result.score >= 80 ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">{t("learn.pronHonest")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="md" variant="secondary" onClick={() => { setResult(null); setRating(null); }}>
                <RotateCcw className="h-4 w-4" /> {t("learn.tryAgain")}
              </Button>
              <Link href="/pronunciation"><Button size="md" variant="ghost">{t("learn.pronAll")}</Button></Link>
            </div>
          </Card>
        ) : (
          <Card>
            <CardTitle>{t("learn.pronRate")}</CardTitle>
            <CardDescription>{t("learn.pronRateHint")}</CardDescription>
            <div className="mt-3 flex gap-2" role="radiogroup" aria-label={t("learn.pronRate")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  onClick={() => setRating(n)}
                  className={cn(
                    "touch-44 flex h-12 flex-1 items-center justify-center rounded-2xl border text-lg font-extrabold tabular-nums",
                    rating === n
                      ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                      : "border-ink-200 text-ink-500 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[11px] font-medium text-ink-400">
              <span>{t("learn.pronRateLow")}</span>
              <span>{t("learn.pronRateHigh")}</span>
            </div>
            {error && <div className="mt-3"><Alert tone="danger" title={t("learn.submitFailed")}>{error}</Alert></div>}
            <div className="mt-3 flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-ink-400" aria-hidden />
              <p className="min-w-0 flex-1 text-xs text-ink-500">{t("learn.pronAccentNote")}</p>
            </div>
            <Button onClick={submit} loading={submitting} disabled={rating === null || submitting} shine size="lg" className="mt-3 w-full">
              {t("learn.pronSubmit")}
            </Button>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
