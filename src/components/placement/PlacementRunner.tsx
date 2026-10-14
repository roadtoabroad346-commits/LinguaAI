"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  PartyPopper,
  RotateCcw,
  Play,
  Square,
  Mic,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { CriteriaBars } from "@/components/learn/CriteriaBars";
import { PageTransition } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import {
  getPlacementListening,
  getPlacementReading,
  getPlacementSpelling,
  placementListeningSpeakText,
  PLACEMENT_ESTIMATED_MINUTES,
  PLACEMENT_PRONUNCIATION,
  PLACEMENT_SECTION_ORDER,
  PLACEMENT_SPEAKING,
  PLACEMENT_TEST_VERSION,
  PLACEMENT_WRITING,
  type PlacementSkill,
} from "@/lib/placement/sections";
import {
  clearGuestPlacement,
  saveGuestPlacement,
} from "@/lib/placement/guest";
import {
  clearBrowserDraft,
  draftOwner,
  draftToPayload,
  draftTouched,
  loadBrowserDraft,
  newDraft,
  payloadToDraft,
  saveBrowserDraft,
  type PlacementDraft,
} from "@/lib/placement/draft";
import {
  LEVEL_DESCRIPTIONS,
  buildReview,
  gradePlacementV3,
  missedTopics,
  summarizeV3,
  weakestBand,
  type PlacementV3Grade,
} from "@/lib/placement/scoring";
import { analyzeReadAloud, analyzeSpeaking } from "@/lib/speaking/analyze";
import { analyzeWriting } from "@/lib/writing/analyze";
import { newAttemptKey } from "@/lib/completions/client";
import { canSpeak, speak, stopSpeaking } from "@/lib/vocab/speak";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type GradeResponse = PlacementV3Grade & {
  saved: boolean;
  repeated?: boolean;
  error?: string;
  profileSynced?: boolean;
  repaired?: boolean;
  warning?: string;
  receipt?: unknown;
};

function countWordsSimple(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(
    () => typeof window !== "undefined" && "MediaRecorder" in window
  );
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(blob);
          });
        } catch {
          /* noop */
        }
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start();
      setRecording(true);
    } catch {
      setError("mic-blocked");
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
    setRecording(false);
  }, []);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl]
  );

  return { recording, audioUrl, error, supported, start, stop };
}

export function PlacementRunner({
  signedIn,
  userId,
  existingLevel,
}: {
  signedIn: boolean;
  userId?: string | null;
  existingLevel: string | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const owner = useMemo(() => draftOwner(signedIn, userId), [signedIn, userId]);

  const grammarQs = useMemo(() => PLACEMENT_QUESTIONS, []);
  const readingItems = useMemo(() => getPlacementReading(), []);
  const listeningItems = useMemo(() => getPlacementListening(), []);
  const spellingItems = useMemo(() => getPlacementSpelling(), []);

  // SSR-safe init: identical placeholder on server + first client paint.
  // Real attempt key + start time are minted in the init effect below.
  const [draft, setDraft] = useState<PlacementDraft>(() => newDraft("pending"));
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [stage, setStage] = useState<"intro" | "test" | "result">("intro");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitLock, setSubmitLock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showTranscripts, setShowTranscripts] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const speakingRec = useRecorder();
  const pronRec = useRecorder();

  // Load autosaved draft once (survives refresh + multi-device). Never auto-submits.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setStartedAt(Date.now());
      const saved = loadBrowserDraft(owner);
      if (saved) {
        if (!cancelled) {
          setDraft(saved);
          setSectionIndex(Math.min(saved.sectionIndex, PLACEMENT_SECTION_ORDER.length - 1));
          setHasResume(draftTouched(saved));
        }
      } else {
        // Fresh attempt: mint a real idempotency key on the client only
        // (avoids SSR crypto/Date.now hydration mismatch from "pending").
        const fresh = newDraft(newAttemptKey());
        if (signedIn) {
          // Login after starting as guest: adopt the guest in-progress draft once
          // so answers are not lost on sign-in. Completed guest results migrate
          // separately via /api/placement/submit (server wins).
          try {
            const guest = loadBrowserDraft("guest");
            if (guest && draftTouched(guest)) {
              if (!cancelled) {
                setDraft(guest);
                setSectionIndex(Math.min(guest.sectionIndex, PLACEMENT_SECTION_ORDER.length - 1));
                setHasResume(true);
                saveBrowserDraft(owner, guest);
                clearBrowserDraft("guest");
              }
            } else if (!cancelled) {
              setDraft(fresh);
            }
          } catch {
            if (!cancelled) setDraft(fresh);
          }
        } else if (!cancelled) {
          setDraft(fresh);
        }
      }
      // Signed-in: server draft is authoritative for multi-device resume.
      // Newest updatedAt wins; fail open to local on any error.
      if (signedIn && !cancelled) {
        try {
          const res = await fetch("/api/placement/draft", { cache: "no-store" });
          const json = (await res.json().catch(() => null)) as {
            draft?: {
              attempt_key: string;
              section_index: number;
              payload: Record<string, unknown>;
              updated_at: string;
            } | null;
          } | null;
          const remote = json?.draft ?? null;
          if (remote && typeof remote.attempt_key === "string" && remote.payload) {
            const remoteTime = new Date(remote.updated_at).getTime();
            setDraft((cur) => {
              const curTouched = draftTouched(cur);
              // Adopt remote when local is empty or remote is strictly newer.
              if (!curTouched || (Number.isFinite(remoteTime) && remoteTime > cur.updatedAt + 2000)) {
                const next = payloadToDraft(
                  remote.attempt_key,
                  remote.section_index,
                  remote.payload as never,
                  cur
                );
                setSectionIndex(Math.min(next.sectionIndex, PLACEMENT_SECTION_ORDER.length - 1));
                setHasResume(true);
                try {
                  saveBrowserDraft(owner, next);
                } catch {
                  /* noop */
                }
                return next;
              }
              return cur;
            });
          }
        } catch {
          /* offline: local draft remains */
        }
      }
      if (!cancelled) setDraftLoaded(true);
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  // Autosave after every meaningful change (local instant + debounced server sync).
  const serverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!draftLoaded || stage === "result") return;
    saveBrowserDraft(owner, { ...draft, sectionIndex });
    if (!signedIn) return;
    if (serverTimer.current) clearTimeout(serverTimer.current);
    serverTimer.current = setTimeout(() => {
      try {
        fetch("/api/placement/draft", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptKey: draft.attemptKey,
            sectionIndex,
            payload: draftToPayload({ ...draft, sectionIndex }),
          }),
        }).catch(() => {});
      } catch {
        /* offline: local remains */
      }
    }, 900);
    return () => {
      if (serverTimer.current) clearTimeout(serverTimer.current);
    };
  }, [draft, sectionIndex, owner, draftLoaded, stage, signedIn]);

  // Speaking timer ticks while recording so duration is honest.
  useEffect(() => {
    if (!speakingRec.recording) return;
    const id = setInterval(() => {
      setDraft((d) => ({ ...d, speakingSecs: Math.min(600, d.speakingSecs + 1) }));
    }, 1000);
    return () => clearInterval(id);
  }, [speakingRec.recording]);

  useEffect(() => () => stopSpeaking(), []);

  const patch = useCallback((p: Partial<PlacementDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
  }, []);

  const totalObjective = grammarQs.length + readingItems.length + listeningItems.length + spellingItems.length;
  const answeredObjective =
    Object.keys(draft.answers).length +
    Object.keys(draft.reading).length +
    Object.keys(draft.listening).length +
    Object.keys(draft.spelling).length;
  const writingWords = useMemo(() => countWordsSimple(draft.writingText), [draft.writingText]);
  const speakingWords = useMemo(() => countWordsSimple(draft.speakingTranscript), [draft.speakingTranscript]);
  const pronWords = useMemo(
    () => countWordsSimple(draft.pronunciationTranscript),
    [draft.pronunciationTranscript]
  );
  const productiveDone =
    (writingWords >= 15 ? 1 : 0) + (speakingWords >= 10 ? 1 : 0) + (pronWords >= 8 ? 1 : 0);
  const totalUnits = totalObjective + 3;
  const answeredUnits = answeredObjective + productiveDone;
  const overallProgress = totalUnits > 0 ? Math.round((answeredUnits / totalUnits) * 100) : 0;

  const answeredSkillsEstimate =
    (Object.keys(draft.answers).length >= 10 ? 1 : 0) +
    (Object.keys(draft.reading).length >= 3 ? 1 : 0) +
    (Object.keys(draft.listening).length >= 3 ? 1 : 0) +
    (Object.keys(draft.spelling).length >= 4 ? 1 : 0) +
    (writingWords >= 15 ? 1 : 0) +
    (speakingWords >= 10 ? 1 : 0) +
    (pronWords >= 8 ? 1 : 0);
  const willBeInsufficient = answeredSkillsEstimate < 4;

  function playText(id: string, text: string) {
    setAudioError(null);
    if (!canSpeak()) {
      setAudioError(t("placement.audioUnavailable"));
      return;
    }
    try {
      if (playingId === id) {
        stopSpeaking();
        setPlayingId(null);
        return;
      }
      stopSpeaking();
      speak(text.slice(0, 1500), "en-US");
      setPlayingId(id);
      // SpeechSynthesis has no reliable onend across browsers here; clear after estimate.
      const words = text.split(/\s+/).filter(Boolean).length;
      const ms = Math.min(60000, Math.max(3000, (words / 150) * 60000));
      setTimeout(() => setPlayingId((cur) => (cur === id ? null : cur)), ms);
    } catch {
      setAudioError(t("placement.audioError"));
      setPlayingId(null);
    }
  }

  async function submit() {
    if (submitting || submitLock || result || !draftLoaded) return;
    // Never submit with the SSR placeholder key.
    const attemptKey =
      draft.attemptKey && draft.attemptKey !== "pending" && draft.attemptKey.length >= 4
        ? draft.attemptKey
        : newAttemptKey();
    if (attemptKey !== draft.attemptKey) {
      setDraft((d) => ({ ...d, attemptKey }));
    }
    setError(null);
    setSubmitting(true);
    setSubmitLock(true);
    try {
      const payload = {
        answers: grammarQs
          .filter((q) => draft.answers[q.id] !== undefined)
          .map((q) => ({ questionId: q.id, selected: draft.answers[q.id] })),
        reading: readingItems
          .filter((r) => draft.reading[r.questionId] !== undefined)
          .map((r) => ({ questionId: r.questionId, selected: draft.reading[r.questionId] })),
        listening: listeningItems
          .filter((r) => draft.listening[r.questionId] !== undefined)
          .map((r) => ({ questionId: r.questionId, selected: draft.listening[r.questionId] })),
        spelling: spellingItems
          .filter((s) => draft.spelling[s.slug] !== undefined)
          .map((s) => {
            const v = draft.spelling[s.slug];
            return { slug: s.slug, typed: v.typed ?? "", selected: v.selected, choices: v.choices ?? s.choices };
          }),
        writingText: draft.writingText.slice(0, 3000),
        speakingTranscript: draft.speakingTranscript.slice(0, 3000),
        speakingSecs: draft.speakingSecs,
        pronunciationTranscript: draft.pronunciationTranscript.slice(0, 2000),
        pronunciationSecs: draft.pronunciationSecs,
        learningMode: draft.learningMode,
        durationSeconds: startedAt > 0 ? Math.max(0, Math.min(7200, Math.round((Date.now() - startedAt) / 1000))) : 0,
        testVersion: PLACEMENT_TEST_VERSION,
        idempotencyKey: attemptKey,
      };
      const res = await fetch("/api/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as GradeResponse;
      if (!res.ok) {
        setError(json.error ?? t("placement.gradedError"));
        setSubmitLock(false);
        return;
      }
      if (!signedIn) {
        try {
          saveGuestPlacement(window.localStorage, {
            answers: payload.answers,
            reading: payload.reading,
            listening: payload.listening,
            spelling: payload.spelling,
            writingText: payload.writingText,
            speakingTranscript: payload.speakingTranscript,
            speakingSecs: payload.speakingSecs,
            pronunciationTranscript: payload.pronunciationTranscript,
            pronunciationSecs: payload.pronunciationSecs,
            testVersion: PLACEMENT_TEST_VERSION,
            learningMode: draft.learningMode,
          });
        } catch {
          /* best-effort */
        }
      } else {
        try {
          clearGuestPlacement(window.localStorage);
        } catch {
          /* best-effort */
        }
      }
      try {
        clearBrowserDraft(owner);
      } catch {
        /* noop */
      }
      if (signedIn) {
        try {
          fetch(`/api/placement/draft?attemptKey=${encodeURIComponent(attemptKey)}`, {
            method: "DELETE",
          }).catch(() => {});
        } catch {
          /* best-effort */
        }
      }
      setResult(json);
      setStage("result");
      celebrate({ big: true, force: true });
    } catch {
      setError(t("common.networkError"));
      setSubmitLock(false);
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    const attemptKey = draft.attemptKey;
    const fresh = newDraft(newAttemptKey());
    fresh.learningMode = draft.learningMode;
    setDraft(fresh);
    setSectionIndex(0);
    setResult(null);
    setError(null);
    setSubmitLock(false);
    setStage("test");
    try {
      clearBrowserDraft(owner);
    } catch {
      /* noop */
    }
    if (signedIn) {
      try {
        fetch(`/api/placement/draft?attemptKey=${encodeURIComponent(attemptKey)}`, {
          method: "DELETE",
        }).catch(() => {});
      } catch {
        /* noop */
      }
    }
  }

  function discardDraft() {
    const attemptKey = draft.attemptKey;
    const fresh = newDraft(newAttemptKey());
    fresh.learningMode = draft.learningMode;
    setDraft(fresh);
    setSectionIndex(0);
    setHasResume(false);
    try {
      clearBrowserDraft(owner);
    } catch {
      /* noop */
    }
    if (signedIn) {
      try {
        fetch(`/api/placement/draft?attemptKey=${encodeURIComponent(attemptKey)}`, {
          method: "DELETE",
        }).catch(() => {});
      } catch {
        /* noop */
      }
    }
  }

  // ---------- Result state (detailed, honest, no invented errors) ----------
  if (stage === "result" && result) {
    const grade = result;
    const skills = grade.skills;
    const review = buildReview({
      score: 0,
      total: grammarQs.length,
      percent: 0,
      level: "A1",
      perBand: grade.perBand,
      answers: (grade.answers ?? []) as never,
    });
    void review;
    // Client-side deterministic details for productive skills (same functions as server).
    const writingDetail = analyzeWriting(draft.writingText, {
      minWords: PLACEMENT_WRITING.minWords,
      maxWords: PLACEMENT_WRITING.maxWords,
    });
    const speakingDetail = analyzeSpeaking(draft.speakingTranscript, {
      minWords: PLACEMENT_SPEAKING.minWords,
      durationSecs: draft.speakingSecs,
    });
    const pronDetail = analyzeReadAloud(PLACEMENT_PRONUNCIATION.text, draft.pronunciationTranscript, draft.pronunciationSecs);

    const grammarReview = (() => {
      try {
        const byId = new Map(grammarQs.map((q) => [q.id, q]));
        const out: Array<{ prompt: string; topic: string; level: string; your: string; correct: string; explanation: string }> = [];
        for (const a of (grade.answers ?? []) as Array<{ questionId: string; selected: number; correct: boolean; level: string }>) {
          if (a.correct) continue;
          const q = byId.get(a.questionId);
          if (!q) continue;
          out.push({
            prompt: q.prompt,
            topic: q.topic,
            level: q.level,
            your: q.options[a.selected] ?? "—",
            correct: q.options[q.answer] ?? "—",
            explanation: q.explanation,
          });
        }
        return out;
      } catch {
        return [];
      }
    })();

    const spellingWrong = spellingItems.filter((s) => {
      const v = draft.spelling[s.slug];
      if (!v) return false;
      if (typeof v.selected === "number" && Array.isArray(v.choices ?? s.choices)) {
        const choices = v.choices ?? s.choices ?? [];
        const entry = spellingItems.find((x) => x.slug === s.slug);
        return choices[v.selected] !== entry?.word;
      }
      const typed = String(v.typed ?? "").trim().toLowerCase();
      return typed.length === 0 || typed !== s.word.toLowerCase();
    });

    const weak = skills ? weakestBand(grade.perBand) : "A1";
    const topics = (() => {
      try {
        return missedTopics(
          buildReview({
            score: 0,
            total: grammarQs.length,
            percent: 0,
            level: "A1",
            perBand: grade.perBand,
            answers: (grade.answers ?? []) as never,
          })
        );
      } catch {
        return [] as string[];
      }
    })();

    return (
      <PageTransition>
        <Card className="relative overflow-hidden text-center">
          <div aria-hidden className="bg-mesh absolute inset-0 opacity-70" />
          <div className="relative">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="bg-brand-gradient mx-auto flex h-20 w-20 items-center justify-center rounded-[1.75rem] text-white shadow-pop"
            >
              <PartyPopper className="h-9 w-9" />
            </motion.div>
            <p className="mt-4 text-sm font-semibold text-ink-500">{t("placement.yourLevel")}</p>
            <p className="font-display text-gradient text-6xl font-extrabold">{grade.level}</p>
            <CardDescription className="mx-auto mt-2 max-w-md">
              {t("placement.correctOf", {
                score: grade.score,
                total: grade.total,
                percent: grade.percent,
              })}{" "}
              — {LEVEL_DESCRIPTIONS[grade.level as keyof typeof LEVEL_DESCRIPTIONS]}
            </CardDescription>
            <p className="mx-auto mt-2 max-w-md text-xs text-ink-500">{summarizeV3(grade)}</p>
            <p className="mx-auto mt-1 max-w-md text-[11px] text-ink-500 dark:text-ink-300">{t("placement.estimateNote")}</p>
            {grade.overall?.insufficient && (
              <div className="mx-auto mt-3 max-w-md text-left">
                <Alert tone="warning" title={t("placement.insufficientTitle")}>
                  {t("placement.insufficientDesc")}
                </Alert>
              </div>
            )}
            {grade.repeated && (
              <div className="mx-auto mt-3 max-w-md text-left">
                <Alert tone="brand" title={t("placement.duplicateSafe")}>
                  {t("placement.duplicateSafeDesc")}
                </Alert>
              </div>
            )}

            {skills && (
              <div className="mx-auto mt-4 grid max-w-xl grid-cols-2 gap-2 text-left sm:grid-cols-3">
                {(Object.keys(skills) as PlacementSkill[]).map((k) => (
                  <div key={k} className="min-w-0 rounded-2xl bg-ink-50 px-2.5 py-2 dark:bg-ink-800">
                    <p className="truncate text-[11px] font-bold text-ink-500">{t(`placement.skills.${k}`)}</p>
                    <p className="text-sm font-extrabold tabular-nums">
                      {skills[k].level} · {skills[k].score}
                    </p>
                    <p className="truncate text-[11px] text-ink-500">
                      {skills[k].answered
                        ? `${skills[k].correct}/${skills[k].total}`
                        : t("placement.notEnoughData")}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {grade.overall && (grade.overall.gaps.length > 0 || grade.overall.strengths.length > 0) && (
              <div className="mx-auto mt-4 max-w-xl rounded-2xl border border-ink-200 bg-white p-4 text-left dark:border-ink-700 dark:bg-ink-900">
                <p className="text-sm font-extrabold">{t("placement.whatToFix")}</p>
                {grade.overall.gaps.length > 0 && (
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                    {t("placement.gapsLabel")}: {grade.overall.gaps.map((g) => t(`placement.skills.${g}`)).join(", ")}
                  </p>
                )}
                {grade.overall.strengths.length > 0 && (
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                    {t("placement.strengthsLabel")}:{" "}
                    {grade.overall.strengths.map((g) => t(`placement.skills.${g}`)).join(", ")}
                  </p>
                )}
                {topics.length > 0 && (
                  <p className="mt-1 text-sm text-ink-600 dark:text-ink-300">
                    {t("placement.topicsToReview")}: {topics.join(", ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-ink-500">
                  {t("placement.weakestBand", { band: weak })} · {t("placement.confidenceLabel")}:{" "}
                  {grade.overall.confidence}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/grammar">
                    <Button variant="secondary">{t("placement.practiceGrammar")}</Button>
                  </Link>
                  <Link href="/smart-path">
                    <Button variant="secondary">{t("placement.openSmartPath")}</Button>
                  </Link>
                  <Link href="/ai-teacher">
                    <Button variant="secondary">{t("placement.askTeacher")}</Button>
                  </Link>
                </div>
              </div>
            )}

            <div className="mx-auto mt-4 grid max-w-xl gap-3 text-left">
              {grammarReview.length > 0 && (
                <Card>
                  <CardTitle>{t("placement.reviewGrammar")}</CardTitle>
                  <ol className="mt-2 grid gap-2">
                    {grammarReview.slice(0, 6).map((r, i) => (
                      <li key={i} className="rounded-xl border border-ink-200 p-3 text-sm dark:border-ink-700">
                        <p className="font-bold">{r.prompt}</p>
                        <p className="mt-1 text-rose-600 dark:text-rose-400">
                          {t("placement.yourAnswer")}: {r.your}
                        </p>
                        <p className="text-emerald-700 dark:text-emerald-300">
                          {t("placement.correctAnswer")}: {r.correct}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">{r.explanation}</p>
                      </li>
                    ))}
                  </ol>
                </Card>
              )}

              {spellingWrong.length > 0 && (
                <Card>
                  <CardTitle>{t("placement.reviewSpelling")}</CardTitle>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {spellingWrong.slice(0, 8).map((s) => (
                      <li key={s.slug} className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{s.level}</Badge>
                        <span className="line-through text-rose-600">
                          {String(draft.spelling[s.slug]?.typed ?? "").trim() || "—"}
                        </span>
                        <span aria-hidden>→</span>
                        <strong className="text-emerald-700 dark:text-emerald-300">{s.word}</strong>
                        <span className="w-full text-xs text-ink-500">{s.definition}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {writingWords >= 10 && (
                <Card>
                  <CardTitle>{t("placement.reviewWriting")}</CardTitle>
                  <CardDescription>
                    {t("placement.wordsLabel", { count: writingWords })} · {writingDetail.score}/100
                  </CardDescription>
                  <p className="mt-2 text-xs font-bold uppercase text-ink-500 dark:text-ink-300">{t("placement.yourText")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{draft.writingText}</p>
                  <p className="mt-2 text-xs font-bold uppercase text-ink-500 dark:text-ink-300">{t("placement.correctedText")}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">
                    {writingDetail.improvedText}
                  </p>
                  {writingDetail.errors.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-ink-600 dark:text-ink-300">
                      {writingDetail.errors.slice(0, 6).map((e, i) => (
                        <li key={i}>
                          <strong>[{e.category}]</strong> {e.message}{" "}
                          {e.suggestion ? `— ${e.suggestion}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3">
                    <CriteriaBars criteria={writingDetail.criteria} />
                  </div>
                </Card>
              )}

              {speakingWords >= 10 && (
                <Card>
                  <CardTitle>{t("placement.reviewSpeaking")}</CardTitle>
                  <CardDescription>
                    {t("placement.wordsLabel", { count: speakingWords })} · {speakingDetail.score}/100 ·{" "}
                    {draft.speakingSecs >= 5 ? `${draft.speakingSecs}s` : t("placement.typedOnly")}
                  </CardDescription>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{draft.speakingTranscript}</p>
                  <ul className="mt-2 space-y-1 text-xs text-ink-600 dark:text-ink-300">
                    {speakingDetail.feedback.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <CriteriaBars criteria={speakingDetail.criteria} />
                  </div>
                  <p className="mt-2 text-[11px] text-ink-500 dark:text-ink-300">{t("placement.speakingLimitNote")}</p>
                </Card>
              )}

              {pronWords >= 5 && (
                <Card>
                  <CardTitle>{t("placement.reviewPronunciation")}</CardTitle>
                  <CardDescription>
                    {t("placement.accuracyLabel", { value: pronDetail.accuracy })} · {pronDetail.score}/100
                  </CardDescription>
                  <p className="mt-2 text-xs text-ink-500">{t("placement.pronLimitNote")}</p>
                  {pronDetail.missedWords.length > 0 && (
                    <p className="mt-1 text-sm">
                      {t("placement.missedWords")}: {pronDetail.missedWords.join(", ")}
                    </p>
                  )}
                  <ul className="mt-1 space-y-1 text-xs text-ink-600 dark:text-ink-300">
                    {pronDetail.feedback.map((f, i) => (
                      <li key={i}>· {f}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {!result.saved && (
              <div className="mx-auto mt-4 max-w-md text-left">
                <Alert tone="warning" title={t("placement.resultNotSaved")}>
                  {signedIn ? t("placement.resultNotSavedIn") : t("placement.resultNotSavedOut")}
                </Alert>
              </div>
            )}
            {!signedIn && (
              <div className="mx-auto mt-4 max-w-md text-left">
                <Alert tone="brand" title={t("placement.guestTransfer")}>
                  {t("placement.guestTransferDesc")}
                </Alert>
              </div>
            )}
            {result.saved && result.profileSynced === false && (
              <div className="mx-auto mt-4 max-w-md text-left">
                <Alert tone="warning" title={t("common.couldNotSave")}>
                  {result.warning ?? t("common.couldNotSave")}
                </Alert>
              </div>
            )}

            <fieldset className="mx-auto mt-5 max-w-md text-left">
              <legend className="text-sm font-bold">{t("placement.choosePath")}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {(["guided", "free"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => patch({ learningMode: m })}
                    aria-pressed={draft.learningMode === m}
                    className={cn(
                      "touch-44 rounded-2xl border p-3.5 text-left transition-all",
                      draft.learningMode === m
                        ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.16)] dark:bg-brand-950"
                        : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900"
                    )}
                  >
                    <span className="text-sm font-bold text-ink-900 dark:text-ink-50">
                      {m === "guided" ? t("common.guidedPath") : t("common.freeLearning")}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-600 dark:text-ink-200">
                      {m === "guided" ? t("onboarding.guidedDesc") : t("onboarding.freeDesc")}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              {signedIn ? (
                <ConfirmPathButton mode={draft.learningMode} onDone={() => router.push("/dashboard")} />
              ) : (
                <Link href="/signup">
                  <Button size="lg" shine>
                    {t("auth.signupCta")}
                  </Button>
                </Link>
              )}
              <Button variant="secondary" size="lg" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> {t("placement.retake")}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Link href="/dashboard">
                <Button variant="ghost">{t("placement.goDashboard")}</Button>
              </Link>
              <Link href="/smart-path">
                <Button variant="ghost">{t("placement.openSmartPath")}</Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost">{t("nav.profile")}</Button>
              </Link>
            </div>
          </div>
        </Card>
      </PageTransition>
    );
  }

  // ---------- Intro ----------
  if (stage === "intro") {
    return (
      <PageTransition>
        <Card>
          <h2 className="font-display text-xl font-semibold text-ink-900 dark:text-ink-50">{t("placement.introTitle")}</h2>
          <CardDescription>
            {t("placement.introDesc", { minutes: PLACEMENT_ESTIMATED_MINUTES })}
          </CardDescription>
          <ol className="mt-3 grid gap-2 text-sm">
            {PLACEMENT_SECTION_ORDER.map((s, i) => (
              <li key={s.skill} className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2 dark:bg-ink-800">
                <Badge tone="brand">{i + 1}</Badge>
                <span className="font-semibold">{t(s.titleKey)}</span>
                <span className="ml-auto text-xs text-ink-500">{t("placement.minutesShort", { minutes: s.minutes })}</span>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-2xl border border-ink-200 p-3 text-xs leading-relaxed text-ink-600 dark:border-ink-700 dark:text-ink-300">
            <p>· {t("placement.howItWorks1")}</p>
            <p>· {t("placement.howItWorks2")}</p>
            <p>· {t("placement.howItWorks3")}</p>
            <p>· {t("placement.estimateNote")}</p>
          </div>
          {existingLevel && (
            <p className="mt-2 text-xs text-ink-500">
              {t("profile.placementScore")}: <strong>{existingLevel}</strong> · {t("placement.retakeHint")}
            </p>
          )}
          <fieldset className="mt-4">
            <legend className="text-sm font-bold">{t("placement.choosePath")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["guided", "free"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => patch({ learningMode: m })}
                  aria-pressed={draft.learningMode === m}
                  className={cn(
                    "touch-44 rounded-2xl border p-3.5 text-left transition-all",
                    draft.learningMode === m
                      ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.16)] dark:bg-brand-950"
                      : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900"
                  )}
                >
                  <span className="text-sm font-bold">{m === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</span>
                  <span className="mt-0.5 block text-xs text-ink-600 dark:text-ink-200">
                    {m === "guided" ? t("onboarding.guidedDesc") : t("onboarding.freeDesc")}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              size="lg"
              shine
              className="flex-1"
              onClick={() => setStage("test")}
              disabled={!draftLoaded}
            >
              {hasResume ? t("placement.continueTest") : t("placement.start")}{" "}
              <ArrowRight className="h-4 w-4" />
            </Button>
            {hasResume && (
              <Button variant="secondary" size="lg" onClick={discardDraft}>
                {t("placement.discardDraft")}
              </Button>
            )}
          </div>
          {hasResume && (
            <p className="mt-2 text-center text-xs text-ink-500">{t("placement.resumeHint")}</p>
          )}
          <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-300">{t("placement.a11yNote")}</p>
        </Card>
      </PageTransition>
    );
  }

  // ---------- Test ----------
  const section = PLACEMENT_SECTION_ORDER[sectionIndex];
  const isLast = sectionIndex === PLACEMENT_SECTION_ORDER.length - 1;

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl pb-10">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-500">
            {t("placement.sectionOf", {
              current: sectionIndex + 1,
              total: PLACEMENT_SECTION_ORDER.length,
            })}{" "}
            · {t(section.titleKey)}
          </p>
          <Badge tone="brand">
            {answeredUnits}/{totalUnits}
          </Badge>
        </div>
        <Progress value={overallProgress} label={`${answeredUnits} / ${totalUnits}`} className="mt-2.5" tone="brand" />
        <nav className="mt-2 flex flex-wrap gap-1.5" aria-label="Placement sections">
          {PLACEMENT_SECTION_ORDER.map((s, i) => (
            <button
              key={s.skill}
              aria-current={i === sectionIndex ? "step" : undefined}
              onClick={() => {
                setDraft((d) => ({ ...d, sectionIndex: i }));
                setSectionIndex(i);
                requestAnimationFrame(() => {
                  document.getElementById("placement-section-heading")?.focus();
                });
              }}
              className={cn(
                "min-h-[44px] rounded-full px-3 py-2 text-xs font-bold",
                i === sectionIndex
                  ? "bg-brand-600 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300"
              )}
            >
              {i + 1}. {t(s.titleKey)}
            </button>
          ))}
        </nav>
        {willBeInsufficient && (
          <div className="mt-2">
            <Alert tone="warning" title={t("placement.insufficientTitle")}>
              {t("placement.fillMore")}
            </Alert>
          </div>
        )}

        <div className="mt-4">
          <h2 id="placement-section-heading" tabIndex={-1} className="sr-only">
            {t(section.titleKey)}
          </h2>
          {section.skill === "grammar" && (
            <Card>
              <CardTitle>{t("placement.sections.grammar")}</CardTitle>
              <CardDescription>{t("placement.grammarDesc")}</CardDescription>
              <div className="mt-3 grid gap-3">
                {grammarQs.map((q, qi) => (
                  <fieldset key={q.id} className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
                    <legend className="px-1 text-sm font-bold">
                      {qi + 1}. {q.prompt} <Badge tone="brand">{q.level}</Badge>
                    </legend>
                    <div className="mt-2 grid gap-2" role="radiogroup" aria-label={q.prompt}>
                      {q.options.map((opt, i) => (
                        <QuizOption
                          key={i}
                          label={opt}
                          prefix={String.fromCharCode(65 + i)}
                          state={draft.answers[q.id] === i ? "selected" : "idle"}
                          checked={draft.answers[q.id] === i}
                          onSelect={() =>
                            setDraft((d) => ({ ...d, answers: { ...d.answers, [q.id]: i } }))
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </Card>
          )}

          {section.skill === "reading" && (
            <div className="grid gap-3">
              {Array.from(new Map(readingItems.map((r) => [r.passageSlug, r])).values()).map((first) => {
                const group = readingItems.filter((r) => r.passageSlug === first.passageSlug);
                return (
                  <Card key={first.passageSlug}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{first.level}</Badge>
                      <CardTitle>{first.title}</CardTitle>
                    </div>
                    <div className="mt-2 space-y-2 text-sm leading-relaxed">
                      {first.paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    <div className="mt-3 grid gap-3">
                      {group.map((r) => (
                        <fieldset key={r.questionId} className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
                          <legend className="px-1 text-sm font-bold">{r.prompt}</legend>
                          <div className="mt-2 grid gap-2" role="radiogroup" aria-label={r.prompt}>
                            {r.choices.map((c, i) => (
                              <QuizOption
                                key={i}
                                label={c}
                                prefix={String.fromCharCode(65 + i)}
                                state={draft.reading[r.questionId] === i ? "selected" : "idle"}
                                checked={draft.reading[r.questionId] === i}
                                onSelect={() =>
                                  setDraft((d) => ({ ...d, reading: { ...d.reading, [r.questionId]: i } }))
                                }
                              />
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {section.skill === "listening" && (
            <div className="grid gap-3">
              {mounted && !canSpeak() && (
                <Alert tone="warning" title={t("placement.audioUnavailable")}>
                  {t("placement.audioUnavailableDesc")}
                </Alert>
              )}
              {audioError && (
                <Alert tone="danger" title={t("placement.audioError")}>
                  {audioError}
                </Alert>
              )}
              {Array.from(new Map(listeningItems.map((r) => [r.trackSlug, r])).values()).map((first) => {
                const group = listeningItems.filter((r) => r.trackSlug === first.trackSlug);
                const text = placementListeningSpeakText(first.lines);
                const tid = `listen-${first.trackSlug}`;
                const shown = showTranscripts[first.trackSlug] ?? false;
                return (
                  <Card key={first.trackSlug}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{first.level}</Badge>
                      <CardTitle>{first.title}</CardTitle>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => playText(tid, text)}
                        aria-pressed={playingId === tid}
                      >
                        {playingId === tid ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}{" "}
                        {playingId === tid ? t("placement.stopAudio") : t("placement.playAudio")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShowTranscripts((s) => ({ ...s, [first.trackSlug]: !shown }))
                        }
                      >
                        {shown ? t("placement.hideTranscript") : t("placement.showTranscript")}
                      </Button>
                    </div>
                    {shown && (
                      <div className="mt-2 space-y-1 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-800">
                        {first.lines.map((l, i) => (
                          <p key={i}>
                            <strong>{l.speaker}:</strong> {l.text}
                          </p>
                        ))}
                      </div>
                    )}
                    {!shown && (
                      <p className="mt-2 text-xs text-ink-500">{t("placement.listenFirstHint")}</p>
                    )}
                    <div className="mt-3 grid gap-3">
                      {group.map((r) => (
                        <fieldset key={r.questionId} className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
                          <legend className="px-1 text-sm font-bold">{r.prompt}</legend>
                          <div className="mt-2 grid gap-2" role="radiogroup" aria-label={r.prompt}>
                            {r.choices.map((c, i) => (
                              <QuizOption
                                key={i}
                                label={c}
                                prefix={String.fromCharCode(65 + i)}
                                state={draft.listening[r.questionId] === i ? "selected" : "idle"}
                                checked={draft.listening[r.questionId] === i}
                                onSelect={() =>
                                  setDraft((d) => ({
                                    ...d,
                                    listening: { ...d.listening, [r.questionId]: i },
                                  }))
                                }
                              />
                            ))}
                          </div>
                        </fieldset>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {section.skill === "spelling" && (
            <Card>
              <CardTitle>{t("placement.sections.spelling")}</CardTitle>
              <CardDescription>{t("placement.spellingDesc")}</CardDescription>
              <div className="mt-3 grid gap-3">
                {spellingItems.map((s) => {
                  const v = draft.spelling[s.slug];
                  return (
                    <div key={s.slug} className="rounded-2xl border border-ink-200 p-3 dark:border-ink-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="brand">{s.level}</Badge>
                        <p className="text-sm font-bold">{s.definition}</p>
                      </div>
                      <p className="mt-1 text-xs italic text-ink-500">{s.example}</p>
                      {s.kind === "choice" && s.choices ? (
                        <div className="mt-2 grid gap-2" role="radiogroup" aria-label={s.definition}>
                          {s.choices.map((c, i) => (
                            <QuizOption
                              key={i}
                              label={c}
                              prefix={String.fromCharCode(65 + i)}
                              state={v?.selected === i ? "selected" : "idle"}
                              checked={v?.selected === i}
                              onSelect={() =>
                                setDraft((d) => ({
                                  ...d,
                                  spelling: { ...d.spelling, [s.slug]: { selected: i, choices: s.choices } },
                                }))
                              }
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`spell-${s.slug}`}>
                            {s.definition}
                          </label>
                          <input
                            id={`spell-${s.slug}`}
                            className="touch-44 min-w-0 flex-1 rounded-xl border border-ink-300 bg-white px-3 py-2.5 text-[15px] dark:border-ink-600 dark:bg-ink-900"
                            placeholder={t("placement.typeWord")}
                            value={v?.typed ?? ""}
                            autoComplete="off"
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                spelling: { ...d.spelling, [s.slug]: { typed: e.target.value } },
                              }))
                            }
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => playText(`spell-${s.slug}`, s.word)}
                          >
                            <Play className="h-4 w-4" /> {t("placement.playAudio")}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {section.skill === "writing" && (
            <Card>
              <CardTitle>{PLACEMENT_WRITING.title}</CardTitle>
              <CardDescription>{PLACEMENT_WRITING.prompt}</CardDescription>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-500">
                {PLACEMENT_WRITING.tips.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>
              <label className="sr-only" htmlFor="placement-writing">
                {PLACEMENT_WRITING.title}
              </label>
              <textarea
                id="placement-writing"
                rows={7}
                maxLength={3000}
                value={draft.writingText}
                onChange={(e) => patch({ writingText: e.target.value.slice(0, 3000) })}
                placeholder={t("placement.writingPlaceholder")}
                className="mt-3 min-h-[160px] w-full scroll-mb-40 rounded-2xl border border-ink-300 bg-white p-3.5 text-[15px] leading-relaxed dark:border-ink-600 dark:bg-ink-900"
              />
              <p className="mt-1 text-xs tabular-nums text-ink-500" role="status">
                {t("placement.wordsLabel", { count: writingWords })} · {t("placement.minLabel", { count: PLACEMENT_WRITING.minWords })}
                {writingWords > 0 && writingWords < PLACEMENT_WRITING.minWords
                  ? ` · ${t("placement.needMore", { count: PLACEMENT_WRITING.minWords - writingWords })}`
                  : ""}
              </p>
            </Card>
          )}

          {section.skill === "speaking" && (
            <Card>
              <CardTitle>{PLACEMENT_SPEAKING.title}</CardTitle>
              <CardDescription>{PLACEMENT_SPEAKING.prompt}</CardDescription>
              <ul className="mt-2 space-y-0.5 text-xs text-ink-500">
                {PLACEMENT_SPEAKING.questions.map((q, i) => (
                  <li key={i}>· {q}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!speakingRec.supported ? (
                  <Alert tone="warning" title={t("placement.micUnsupported")}>
                    {t("placement.micUnsupportedDesc")}
                  </Alert>
                ) : speakingRec.recording ? (
                  <Button
                    variant="secondary"
                    onClick={speakingRec.stop}
                    aria-pressed={true}
                  >
                    <Square className="h-4 w-4" /> {t("placement.stopRecording")} ({draft.speakingSecs}s)
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={speakingRec.start}
                    aria-pressed={false}
                  >
                    <Mic className="h-4 w-4" /> {t("placement.startRecording")}
                  </Button>
                )}
                <span role="status" aria-live="polite" className="sr-only">
                  {speakingRec.recording
                    ? `${t("placement.stopRecording")} (${draft.speakingSecs}s)`
                    : t("placement.startRecording")}
                </span>
                {speakingRec.audioUrl && (
                  <audio
                    controls
                    src={speakingRec.audioUrl}
                    className="h-9 w-full sm:w-56"
                    aria-label={t("placement.recordingLabel", { section: PLACEMENT_SPEAKING.title })}
                  />
                )}
              </div>
              {speakingRec.error && (
                <div className="mt-2">
                  <Alert tone="warning" title={t("placement.micBlockedTitle")}>
                    {t("placement.micBlockedDesc")}
                  </Alert>
                </div>
              )}
              <p className="mt-2 text-xs text-ink-500">{t("placement.speakingAlt")}</p>
              <label className="sr-only" htmlFor="placement-speaking">
                {PLACEMENT_SPEAKING.title}
              </label>
              <textarea
                id="placement-speaking"
                rows={6}
                maxLength={3000}
                value={draft.speakingTranscript}
                onChange={(e) => patch({ speakingTranscript: e.target.value.slice(0, 3000) })}
                placeholder={t("placement.speakingPlaceholder")}
                className="mt-2 min-h-[130px] w-full scroll-mb-40 rounded-2xl border border-ink-300 bg-white p-3.5 text-[15px] leading-relaxed dark:border-ink-600 dark:bg-ink-900"
              />
              <p className="mt-1 text-xs tabular-nums text-ink-500" role="status">
                {t("placement.wordsLabel", { count: speakingWords })} ·{" "}
                {draft.speakingSecs >= 5 ? `${draft.speakingSecs}s` : t("placement.typedOnly")} ·{" "}
                {t("placement.minLabel", { count: PLACEMENT_SPEAKING.minWords })}
              </p>
              <p className="mt-1 text-[11px] text-ink-500 dark:text-ink-300">{t("placement.speakingLimitNote")}</p>
            </Card>
          )}

          {section.skill === "pronunciation" && (
            <Card>
              <CardTitle>{PLACEMENT_PRONUNCIATION.title}</CardTitle>
              <CardDescription>{t("placement.pronDesc")}</CardDescription>
              <div className="mt-2 rounded-2xl bg-ink-50 p-3 text-sm leading-relaxed dark:bg-ink-800">
                <p>{PLACEMENT_PRONUNCIATION.text}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => playText("pron-ref", PLACEMENT_PRONUNCIATION.text)}>
                  <Play className="h-4 w-4" /> {t("placement.playReference")}
                </Button>
                {!pronRec.supported ? (
                  <Alert tone="warning" title={t("placement.micUnsupported")}>
                    {t("placement.micUnsupportedDesc")}
                  </Alert>
                ) : pronRec.recording ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={pronRec.stop}
                    aria-pressed={true}
                  >
                    <Square className="h-4 w-4" /> {t("placement.stopRecording")}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={pronRec.start}
                    aria-pressed={false}
                  >
                    <Mic className="h-4 w-4" /> {t("placement.startRecording")}
                  </Button>
                )}
                {pronRec.audioUrl && (
                  <audio
                    controls
                    src={pronRec.audioUrl}
                    className="h-9 w-full sm:w-56"
                    aria-label={t("placement.recordingLabel", { section: PLACEMENT_PRONUNCIATION.title })}
                  />
                )}
              </div>
              {pronRec.error && (
                <div className="mt-2">
                  <Alert tone="warning" title={t("placement.micBlockedTitle")}>
                    {t("placement.micBlockedDesc")}
                  </Alert>
                </div>
              )}
              <p className="mt-2 text-xs text-ink-500">{t("placement.pronAlt")}</p>
              <label className="sr-only" htmlFor="placement-pron">
                {PLACEMENT_PRONUNCIATION.title}
              </label>
              <textarea
                id="placement-pron"
                rows={4}
                maxLength={2000}
                value={draft.pronunciationTranscript}
                onChange={(e) =>
                  patch({
                    pronunciationTranscript: e.target.value.slice(0, 2000),
                    pronunciationSecs: e.target.value.trim().length > 0 ? Math.max(draft.pronunciationSecs, 5) : draft.pronunciationSecs,
                  })
                }
                placeholder={t("placement.pronPlaceholder")}
                className="mt-2 min-h-[100px] w-full scroll-mb-40 rounded-2xl border border-ink-300 bg-white p-3.5 text-[15px] leading-relaxed dark:border-ink-600 dark:bg-ink-900"
              />
              <p className="mt-1 text-xs tabular-nums text-ink-500" role="status">
                {t("placement.wordsLabel", { count: pronWords })}
              </p>
              <p className="mt-1 flex items-start gap-1 text-[11px] text-ink-500 dark:text-ink-300">
                <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {t("placement.pronLimitNote")}
              </p>
            </Card>
          )}
        </div>

        {error && (
          <div className="mt-3">
            <Alert tone="danger" title={t("common.saveFailed")}>
              {error}
            </Alert>
          </div>
        )}

        <StickyActionBar className="mt-4">
          <Button
            variant="ghost"
            onClick={() => setSectionIndex((i) => Math.max(0, i - 1))}
            disabled={sectionIndex === 0 || submitting}
            className="flex-1"
          >
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>
          {isLast ? (
            <Button onClick={submit} loading={submitting} disabled={submitting || submitLock} shine className="flex-[2]">
              {t("placement.submit")} · {answeredUnits}/{totalUnits}
            </Button>
          ) : (
            <Button onClick={() => setSectionIndex((i) => Math.min(PLACEMENT_SECTION_ORDER.length - 1, i + 1))} className="flex-[2]">
              {t("common.next")} <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </StickyActionBar>
        <p className="mt-2 text-center text-xs text-ink-500 dark:text-ink-300">
          {t("placement.autosaved")} · {t("placement.estimateNote")}
        </p>
      </div>
    </PageTransition>
  );
}

function ConfirmPathButton({ mode, onDone }: { mode: "guided" | "free"; onDone: () => void }) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  async function confirm() {
    setSaving(true);
    setFailed(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningMode: mode }),
      });
      if (!res.ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
      router.refresh();
      onDone();
    }
  }
  return (
    <span className="inline-flex min-w-0 flex-col gap-1">
      <Button size="lg" shine onClick={confirm} loading={saving}>
        {t("common.continue")} · {mode === "guided" ? t("common.guidedPath") : t("common.freeLearning")}
      </Button>
      {failed && <span className="text-xs text-amber-700">{t("common.couldNotSave")}</span>}
    </span>
  );
}
