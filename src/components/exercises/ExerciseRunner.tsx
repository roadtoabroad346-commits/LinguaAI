"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Chip, Progress } from "@/components/ui/feedback";
import { QuizOption } from "@/components/learn/QuizOption";
import { playReferenceAudio } from "@/lib/audio/tts-client";
import type { ExerciseAnswer, ExerciseGrade, LearningSkill, PublicExercise } from "@/lib/exercises/types";
import { restorePracticeIndex } from "@/lib/exercises/session";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type Mode = "daily" | "smart-review" | "mixed" | "topic";
type Queue = { due: string[]; mistakes: string[]; level: string; prioritySkills: string[] };
type SaveResult = ExerciseGrade & { saved: boolean; revision: number; code?: string };
const SKILLS: LearningSkill[] = ["grammar", "vocabulary", "reading", "listening", "writing", "spelling", "speaking", "pronunciation"];

function dailySeed(): number {
  return Number(new Date().toISOString().slice(0, 10).replaceAll("-", ""));
}

function deterministicPick(items: PublicExercise[], count: number): PublicExercise[] {
  const seed = dailySeed();
  return [...items].sort((a, b) => ((a.id.length * 31 + seed) % 97) - ((b.id.length * 31 + seed) % 97) || a.id.localeCompare(b.id)).slice(0, count);
}

function sessionStorageKey(mode: Mode) { return `linguaai_practice_session_${mode}`; }

export function ExerciseRunner({ exercises, initialLevel }: { exercises: PublicExercise[]; initialLevel: string }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("daily");
  const [level, setLevel] = useState(initialLevel);
  const [skill, setSkill] = useState("all");
  const [topic, setTopic] = useState("all");
  const [queue, setQueue] = useState<Queue>({ due: [], mistakes: [], level: initialLevel, prioritySkills: [] });
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<ExerciseAnswer>("");
  const [grade, setGrade] = useState<SaveResult | null>(null);
  const [revision, setRevision] = useState(0);
  const [sessionKey, setSessionKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);

  const topics = useMemo(() => [...new Set(exercises.filter((x) => level === "all" || x.level === level).map((x) => x.topic))].sort(), [exercises, level]);
  const selected = useMemo(() => {
    let pool = exercises.filter((exercise) => (level === "all" || exercise.level === level) && (skill === "all" || exercise.skill === skill));
    if (mode === "topic" && topic !== "all") pool = pool.filter((exercise) => exercise.topic === topic);
    if (mode === "smart-review") {
      const ids = [...queue.due, ...queue.mistakes];
      const queued = ids.map((id) => exercises.find((exercise) => exercise.id === id)).filter(Boolean) as PublicExercise[];
      if (queued.length) pool = queued;
      else if (queue.prioritySkills.length) pool = pool.filter((exercise) => queue.prioritySkills.includes(exercise.skill));
    }
    return mode === "daily" ? deterministicPick(pool, 5) : pool;
  }, [exercises, level, mode, queue, skill, topic]);
  const current = selected[index % Math.max(1, selected.length)];

  useEffect(() => {
    fetch("/api/practice/queue", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      setQueue(data);
      if (data.level) setLevel(data.level);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    let key = window.localStorage.getItem(sessionStorageKey(mode));
    if (!key) {
      key = crypto.randomUUID();
      window.localStorage.setItem(sessionStorageKey(mode), key);
    }
    const resolvedKey = key;
    queueMicrotask(() => {
      setSessionKey(resolvedKey);
      setRevision(0);
      setIndex(0);
      setGrade(null);
      setAnswer("");
    });
    fetch(`/api/practice/session?sessionKey=${encodeURIComponent(key)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.session?.status === "in_progress") {
          setRevision(data.session.revision ?? 0);
          setIndex(restorePracticeIndex(selected, data.answers ?? []));
        }
      }).catch(() => undefined);
  }, [mode, selected]);

  useEffect(() => {
    queueMicrotask(() => {
      setAnswer(current?.kind === "matching" ? {} : current?.kind === "ordering" || current?.kind === "multiple-select" ? [] : "");
      setGrade(null); setError(null); setRevealed(false); setRecorded(false);
    });
  }, [current?.id, current?.kind]);

  function resetSession() {
    const key = crypto.randomUUID();
    window.localStorage.setItem(sessionStorageKey(mode), key);
    setSessionKey(key); setRevision(0); setIndex(0); setGrade(null); setAnswer("");
  }

  async function submit(nextAnswer = answer) {
    if (!current || !sessionKey) return;
    setSubmitting(true); setError(null);
    try {
      const response = await fetch("/api/practice/session", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionKey, expectedRevision: revision, mode: mode === "smart-review" ? "smart-review" : mode,
          exerciseId: current.id, contentVersion: current.contentVersion, answer: nextAnswer,
          complete: index >= selected.length - 1,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("practice.saveFailed"));
      setGrade(data);
      if (data.saved) setRevision(data.revision);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("practice.saveFailed"));
    } finally { setSubmitting(false); }
  }

  async function toggleRecording() {
    if (recording) { recorder.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      media.onstop = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); setRecorded(true); setAnswer(true); };
      recorder.current = media; media.start(); setRecording(true);
    } catch { setError(t("practice.micUnavailable")); }
  }

  if (!current) return <Alert tone="warning" title={t("practice.noExercises")}>{t("practice.changeFilters")}</Alert>;
  const isText = ["fill-blank", "error-correction", "sentence-transformation", "short-answer", "dictation", "long-form-writing"].includes(current.kind);
  const isRecording = ["voice-recording", "pronunciation-practice"].includes(current.kind);
  const canSubmit = Array.isArray(answer) ? answer.length > 0 : typeof answer === "object" ? Object.keys(answer).length > 0 : Boolean(answer);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("practice.mode")}> 
          {(["daily", "smart-review", "mixed", "topic"] as Mode[]).map((item) => (
            <Chip key={item} active={mode === item} onClick={() => setMode(item)}>{t(`practice.mode_${item}`)}</Chip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["A1", "A2", "B1", "B2", "C1", "all"].map((item) => <Chip key={item} active={level === item} onClick={() => { setLevel(item); setIndex(0); }}>{item === "all" ? t("learn.all") : item}</Chip>)}
        </div>
        <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1">
          {["all", ...SKILLS].map((item) => <Chip key={item} active={skill === item} onClick={() => { setSkill(item); setIndex(0); }}>{item === "all" ? t("learn.all") : item}</Chip>)}
        </div>
        {mode === "topic" && (
          <label className="mt-3 block text-sm font-semibold">{t("practice.topic")}
            <select value={topic} onChange={(event) => { setTopic(event.target.value); setIndex(0); }} className="mt-1 min-h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900">
              <option value="all">{t("practice.allTopics")}</option>{topics.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
        )}
      </Card>

      <div className="flex items-center gap-3" aria-live="polite">
        <Progress ariaLabel={t("practice.progress")} value={((index + (grade ? 1 : 0)) / Math.max(1, selected.length)) * 100} className="flex-1" />
        <span className="text-sm font-bold tabular-nums">{Math.min(index + 1, selected.length)}/{selected.length}</span>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{current.level}</Badge><Badge>{current.skill}</Badge><Badge>{current.kind}</Badge></div>
        <CardTitle className="mt-2">{current.title}</CardTitle>
        <CardDescription>{current.instructions}</CardDescription>
        {current.passage && <blockquote className="mt-3 rounded-2xl bg-ink-50 p-4 text-sm leading-relaxed dark:bg-ink-800">{current.passage}</blockquote>}
        <p className="mt-4 text-lg font-semibold leading-relaxed">{current.prompt}</p>

        {current.hasReferenceAudio && (
          <Button className="mt-3" variant="secondary" onClick={() => playReferenceAudio({ kind: "exercise", slug: current.id }).catch(() => setError(t("practice.audioUnavailable")))}>
            <Volume2 className="h-4 w-4" /> {t("practice.playAudio")}
          </Button>
        )}

        {current.choices && current.kind !== "multiple-select" && (
          <div className="mt-3 space-y-2">{current.choices.map((choice) => <QuizOption key={choice.id} label={choice.label} state={answer === choice.id ? "selected" : "idle"} disabled={Boolean(grade)} onSelect={() => setAnswer(choice.id)} />)}</div>
        )}
        {current.choices && current.kind === "multiple-select" && (
          <div className="mt-3 space-y-2">{current.choices.map((choice) => {
            const values = Array.isArray(answer) ? answer : [];
            return <QuizOption key={choice.id} label={choice.label} role="checkbox" checked={values.includes(choice.id)} state={values.includes(choice.id) ? "selected" : "idle"} disabled={Boolean(grade)} onSelect={() => setAnswer(values.includes(choice.id) ? values.filter((id) => id !== choice.id) : [...values, choice.id])} />;
          })}</div>
        )}
        {isText && (
          <textarea rows={current.kind === "long-form-writing" ? 8 : 3} value={typeof answer === "string" ? answer : ""} disabled={Boolean(grade)} onChange={(event) => setAnswer(event.target.value)} className="mt-3 min-h-24 w-full rounded-2xl border border-ink-200 bg-white p-4 text-base focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-950" aria-label={t("practice.yourAnswer")} />
        )}
        {current.kind === "matching" && current.pairLeft && current.pairRight && (
          <div className="mt-3 space-y-2">{current.pairLeft.map((left) => <label key={left} className="grid gap-1 text-sm font-semibold sm:grid-cols-[10rem_1fr] sm:items-center"><span>{left}</span><select disabled={Boolean(grade)} value={typeof answer === "object" && !Array.isArray(answer) ? answer[left] ?? "" : ""} onChange={(event) => setAnswer({ ...(typeof answer === "object" && !Array.isArray(answer) ? answer : {}), [left]: event.target.value })} className="min-h-11 rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900"><option value="">—</option>{current.pairRight!.map((right) => <option key={right}>{right}</option>)}</select></label>)}</div>
        )}
        {current.kind === "ordering" && current.tokens && (
          <div className="mt-3"><div className="min-h-12 rounded-2xl bg-ink-50 p-2 dark:bg-ink-800">{Array.isArray(answer) && answer.length ? answer.join(" ") : t("practice.tapWords")}</div><div className="mt-2 flex flex-wrap gap-2">{current.tokens.map((token, i) => <button type="button" key={`${token}-${i}`} disabled={Boolean(grade) || (Array.isArray(answer) && answer.includes(token))} onClick={() => setAnswer([...(Array.isArray(answer) ? answer : []), token])} className="touch-44 rounded-xl border border-ink-200 px-3 py-2 disabled:opacity-40 dark:border-ink-700">{token}</button>)}</div></div>
        )}
        {current.kind === "flashcard" && current.flashcard && (
          <div className="mt-3 text-center"><button type="button" onClick={() => setRevealed(true)} className="w-full rounded-2xl bg-brand-50 p-6 text-xl font-bold dark:bg-brand-950">{revealed ? current.flashcard.back : current.flashcard.front}</button>{revealed && <div className="mt-2 flex justify-center gap-2"><Button variant="secondary" onClick={() => { setAnswer("again"); submit("again"); }}>{t("practice.again")}</Button><Button onClick={() => { setAnswer("known"); submit("known"); }}>{t("practice.known")}</Button></div>}</div>
        )}
        {isRecording && (
          <div className="mt-3"><Button variant={recording ? "danger" : "secondary"} onClick={toggleRecording}>{recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{recording ? t("practice.stopRecording") : t("practice.startRecording")}</Button>{recorded && <p className="mt-2 flex items-center gap-1 text-sm text-success-700"><Check className="h-4 w-4" />{t("practice.recordedLocally")}</p>}</div>
        )}

        {grade && <div className="mt-4"><Alert tone={grade.correct === true ? "success" : grade.needsReview ? "brand" : "warning"} title={grade.needsReview ? t("practice.reviewRequired") : grade.correct ? t("practice.correct") : t("practice.notYet")}>{grade.explanation}</Alert></div>}
        {error && <div className="mt-3"><Alert tone="danger" title={t("practice.problem")}>{error}</Alert></div>}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {current.kind === "ordering" && !grade && <Button variant="ghost" onClick={() => setAnswer([])}><RotateCcw className="h-4 w-4" />{t("practice.reset")}</Button>}
          {!grade && current.kind !== "flashcard" && <Button loading={submitting} disabled={!canSubmit || submitting} onClick={() => submit()}>{t("practice.check")}</Button>}
          {grade && index < selected.length - 1 && <Button onClick={() => setIndex((value) => value + 1)}>{t("practice.next")}</Button>}
          {grade && index >= selected.length - 1 && <Button onClick={resetSession}>{t("practice.newSession")}</Button>}
        </div>
      </Card>
      <p className="text-xs text-ink-500">{t("practice.persistenceNote")}</p>
    </div>
  );
}
