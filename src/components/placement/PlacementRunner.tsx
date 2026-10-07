"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
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
      <Card>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <CardTitle className="min-w-0 flex-1">{t("placement.yourLevel")}</CardTitle>
          <Badge tone="brand" className="shrink-0 text-sm">
            {result.level}
          </Badge>
        </div>
        <CardDescription>
          {t("placement.correctOf", { score: result.score, total: result.total, percent: result.percent })} —{" "}
          {LEVEL_DESCRIPTIONS[result.level]}
        </CardDescription>
        <Progress value={result.percent} label={`${result.score} / ${result.total}`} className="mt-4" />
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {(Object.keys(result.perBand) as Array<keyof typeof result.perBand>).map((band) => (
            <div key={band} className="min-w-0 rounded-xl bg-ink-50 px-2 py-2">
              <p className="truncate text-xs font-semibold text-ink-700">{band}</p>
              <p className="text-sm font-bold text-ink-900">
                {result.perBand[band].correct}/{result.perBand[band].total}
              </p>
            </div>
          ))}
        </div>
        {!result.saved && (
          <div className="mt-4">
            <Alert tone="warning" title={t("placement.resultNotSaved")}>
              {signedIn ? t("placement.resultNotSavedIn") : t("placement.resultNotSavedOut")}
            </Alert>
          </div>
        )}
        <div className="mt-4">
          <fieldset>
            <legend className="text-sm font-medium text-ink-700">{t("placement.choosePath")}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {(["guided", "free"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setLearningMode(m)}
                  aria-pressed={learningMode === m}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left text-sm focus-visible:outline-2",
                    learningMode === m
                      ? "border-brand-600 bg-brand-50"
                      : "border-ink-200 bg-white hover:border-ink-300"
                  )}
                >
                  <span className="font-semibold">{m === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</span>
                  <span className="block text-xs text-ink-500">
                    {m === "guided" ? t("onboarding.guidedDesc") : t("onboarding.freeDesc")}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {signedIn ? (
            <ConfirmPathButton mode={learningMode} onDone={() => router.push("/dashboard")} />
          ) : (
            <Link href="/signup">
              <Button>{t("auth.signupCta")}</Button>
            </Link>
          )}
          <Button variant="secondary" onClick={restart}>
            {t("placement.retake")}
          </Button>
        </div>
      </Card>
    );
  }

  // ---------- Intro / empty ----------
  if (total === 0) {
    return <EmptyState title={t("modules.empty")} description={t("modules.emptyDesc")} />;
  }

  const allAnswered = answeredCount === total;

  // ---------- Question state ----------
  return (
    <Card>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1 truncate">
          {t("placement.questionOf", { current: index + 1, total })}
        </CardTitle>
        <Badge>{question.level}</Badge>
      </div>
      <Progress value={((index + 1) / total) * 100} label={`${answeredCount} / ${total}`} className="mt-3" />
      {existingLevel && (
        <p className="mt-2 text-xs text-ink-500">
          {t("profile.placementScore")}: <strong>{existingLevel}</strong>
        </p>
      )}

      <p className="mt-5 text-lg font-medium text-ink-900">{question.prompt}</p>
      <div className="mt-4 grid gap-2" role="radiogroup" aria-label={`Question ${index + 1}`}>
        {question.options.map((opt, i) => {
          const active = currentSelected === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(i)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-2",
                active
                  ? "border-brand-600 bg-brand-50 font-medium"
                  : "border-ink-200 bg-white hover:border-ink-300"
              )}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold">
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mt-4">
          <Alert tone="danger" title={t("common.saveFailed")}>
            {error}
          </Alert>
        </div>
      )}

      <div className="mt-6 flex justify-between gap-2">
        <Button variant="ghost" onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0 || submitting}>
          {t("common.back")}
        </Button>
        {index < total - 1 ? (
          <Button onClick={() => setIndex((i) => Math.min(i + 1, total - 1))} disabled={currentSelected === undefined}>
            {t("common.next")}
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting} disabled={!allAnswered}>
            {allAnswered ? t("placement.submit") : `${answeredCount}/${total}`}
          </Button>
        )}
      </div>
    </Card>
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
      <Button onClick={confirm} loading={saving}>
        {t("common.continue")} · {mode === "guided" ? t("common.guidedPath") : t("common.freeLearning")}
      </Button>
      {failed && <span className="text-xs text-amber-700">{t("common.couldNotSave")}</span>}
    </span>
  );
}
