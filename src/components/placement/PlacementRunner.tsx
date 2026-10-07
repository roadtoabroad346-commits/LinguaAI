"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, PartyPopper, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { PageTransition } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { PLACEMENT_QUESTIONS } from "@/lib/placement/questions";
import { LEVEL_DESCRIPTIONS, type PlacementGrade } from "@/lib/placement/scoring";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

type GradeResponse = PlacementGrade & { saved: boolean; error?: string };

export function PlacementRunner({
  signedIn,
  existingLevel,
}: {
  signedIn: boolean;
  existingLevel: string | null;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [direction, setDirection] = useState(1);
  const [learningMode, setLearningMode] = useState<"guided" | "free">("guided");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GradeResponse | null>(null);

  const question = PLACEMENT_QUESTIONS[index];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const total = PLACEMENT_QUESTIONS.length;
  const currentSelected = answers[question?.id];

  function select(option: number) {
    if (!question || result) return;
    setAnswers((prev) => ({ ...prev, [question.id]: option }));
  }

  function go(delta: number) {
    setDirection(delta > 0 ? 1 : -1);
    setIndex((i) => Math.min(total - 1, Math.max(0, i + delta)));
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        answers: PLACEMENT_QUESTIONS.filter((q) => answers[q.id] !== undefined).map((q) => ({
          questionId: q.id,
          selected: answers[q.id],
        })),
        learningMode,
      };
      const res = await fetch("/api/placement/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as GradeResponse;
      if (!res.ok) {
        setError(json.error ?? t("placement.gradedError"));
        return;
      }
      setResult(json);
      celebrate({ big: true, force: true });
    } catch {
      setError(t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  function restart() {
    setAnswers({});
    setIndex(0);
    setResult(null);
    setError(null);
  }

  // ---------- Result state ----------
  if (result) {
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
            <p className="font-display text-gradient text-6xl font-extrabold">{result.level}</p>
            <CardDescription className="mx-auto mt-2 max-w-md">
              {t("placement.correctOf", { score: result.score, total: result.total, percent: result.percent })} —{" "}
              {LEVEL_DESCRIPTIONS[result.level]}
            </CardDescription>
            <Progress value={result.percent} label={`${result.score} / ${result.total}`} className="mx-auto mt-4 max-w-md" />
            <div className="mx-auto mt-4 grid max-w-md grid-cols-5 gap-2 text-center">
              {(Object.keys(result.perBand) as Array<keyof typeof result.perBand>).map((band) => (
                <div key={band} className="min-w-0 rounded-2xl bg-ink-50 px-1 py-2 dark:bg-ink-800">
                  <p className="truncate text-[11px] font-bold text-ink-500">{band}</p>
                  <p className="text-sm font-extrabold tabular-nums">
                    {result.perBand[band].correct}/{result.perBand[band].total}
                  </p>
                </div>
              ))}
            </div>
            {!result.saved && (
              <div className="mx-auto mt-4 max-w-md text-left">
                <Alert tone="warning" title={t("placement.resultNotSaved")}>
                  {signedIn ? t("placement.resultNotSavedIn") : t("placement.resultNotSavedOut")}
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
                    onClick={() => setLearningMode(m)}
                    aria-pressed={learningMode === m}
                    className={cn(
                      "touch-44 rounded-2xl border p-3.5 text-left transition-all",
                      learningMode === m
                        ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.16)] dark:bg-brand-950"
                        : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900"
                    )}
                  >
                    <span className="text-sm font-bold">{m === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {m === "guided" ? t("onboarding.guidedDesc") : t("onboarding.freeDesc")}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              {signedIn ? (
                <ConfirmPathButton mode={learningMode} onDone={() => router.push("/dashboard")} />
              ) : (
                <Link href="/signup">
                  <Button size="lg" shine>{t("auth.signupCta")}</Button>
                </Link>
              )}
              <Button variant="secondary" size="lg" onClick={restart}>
                <RotateCcw className="h-4 w-4" /> {t("placement.retake")}
              </Button>
            </div>
          </div>
        </Card>
      </PageTransition>
    );
  }

  if (total === 0) {
    return null;
  }

  const allAnswered = answeredCount === total;

  // ---------- Question state: one per screen ----------
  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-xl">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-500">
            {t("placement.questionOf", { current: index + 1, total })}
          </p>
          <Badge tone="brand">{question.level}</Badge>
        </div>
        <Progress value={((index + 1) / total) * 100} label={`${answeredCount} / ${total}`} className="mt-2.5" tone="brand" />
        {existingLevel && (
          <p className="mt-2 text-xs text-ink-500">
            {t("profile.placementScore")}: <strong>{existingLevel}</strong>
          </p>
        )}

        <div className="relative mt-4 min-h-[380px]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={question.id}
              custom={direction}
              initial={{ opacity: 0, x: 48 * direction }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -48 * direction }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
            >
              <Card className="min-h-[300px]">
                <CardTitle className="font-display text-balance text-xl leading-snug">{question.prompt}</CardTitle>
                <div className="mt-4 grid gap-2.5" role="radiogroup" aria-label={`Question ${index + 1}`}>
                  {question.options.map((opt, i) => (
                    <QuizOption
                      key={i}
                      label={opt}
                      prefix={String.fromCharCode(65 + i)}
                      state={currentSelected === i ? "selected" : "idle"}
                      checked={currentSelected === i}
                      onSelect={() => select(i)}
                    />
                  ))}
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && (
          <div className="mt-3">
            <Alert tone="danger" title={t("common.saveFailed")}>{error}</Alert>
          </div>
        )}

        <StickyActionBar className="mt-4">
          <Button variant="ghost" onClick={() => go(-1)} disabled={index === 0 || submitting} className="flex-1">
            <ArrowLeft className="h-4 w-4" /> {t("common.back")}
          </Button>
          {index < total - 1 ? (
            <Button onClick={() => go(1)} disabled={currentSelected === undefined} className="flex-[2]">
              {t("common.next")} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={submit} loading={submitting} disabled={!allAnswered} shine className="flex-[2]">
              {allAnswered ? t("placement.submit") : `${answeredCount}/${total}`}
            </Button>
          )}
        </StickyActionBar>
        <p className="mt-2 text-center text-xs text-ink-400">Reassuring tone: take your time — every answer teaches the Smart Path.</p>
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
