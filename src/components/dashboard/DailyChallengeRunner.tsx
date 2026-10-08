"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatChallengeDate } from "@/lib/i18n/format";

interface PublicQuestion {
  id: string;
  kind: string;
  prompt: string;
  choices: string[];
  hint: string;
}

const KIND_LABEL_KEYS: Record<string, string> = {
  vocab: "nav.vocabulary",
  grammar: "nav.grammar",
  spelling: "nav.spelling",
  reading: "nav.reading",
  listening: "nav.listening",
};

interface ChallengePayload {
  dateKey: string;
  level: string;
  xpPerCorrect: number;
  bonusXp: number;
  questions: PublicQuestion[];
  completed: { score: number; total: number; xp_earned: number } | null;
}

export function DailyChallengeRunner() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<ChallengePayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean; repeated?: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState<Record<string, boolean>>({});

  // Load-once effect: error text uses the mount-time locale (no refetch on language switch).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily-challenge")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("learn.couldNotLoadChallenge"));
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
        <Alert tone="danger" title={t("learn.couldNotLoadChallengeTitle")}>{loadError}</Alert>
        <div className="mt-3"><Button variant="secondary" onClick={() => window.location.reload()}>{t("common.retry")}</Button></div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card aria-busy="true" aria-label={t("learn.loadingChallenge")}>
        <CardTitle>{t("learn.loadingChallenge")}</CardTitle>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100" />
          ))}
        </div>
      </Card>
    );
  }

  if (data.completed && !result) {
    return (
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("learn.alreadyCompleted")}</CardTitle>
          <Badge tone="success" className="shrink-0">{data.completed.score}/{data.completed.total}</Badge>
        </div>
        <CardDescription>{t("learn.earnedToday", { xp: data.completed.xp_earned })}</CardDescription>
        <div className="mt-3"><Link href="/dashboard"><Button variant="secondary" size="sm">{t("learn.backDashboard")}</Button></Link></div>
      </Card>
    );
  }

  if (result) {
    return (
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfectScore") : result.score >= 3 ? t("learn.wellDone") : t("learn.goodEffort")}</CardTitle>
          <Badge tone={result.score >= 3 ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
        </div>
        <CardDescription>
          {result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}
          {result.repeated ? ` ${t("learn.repeatedNote")}` : ""}
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard"><Button size="sm">{t("learn.backDashboard")}</Button></Link>
          <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("dashboard.cards.practiceWords")}</Button></Link>
        </div>
      </Card>
    );
  }

  const answered = Object.keys(answers).length;
  const allAnswered = answered === data.questions.length;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/daily-challenge/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dateKey: data!.dateKey, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "submit failed");
      setResult(json);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{t("learn.todayChallenge")} · {formatChallengeDate(locale, data.dateKey)}</CardTitle>
            <CardDescription>{t("learn.challengeMeta", { level: data.level, n: data.questions.length, xp: data.xpPerCorrect, bonus: data.bonusXp })}</CardDescription>
          </div>
          <Badge className="shrink-0">{t("learn.answeredCount", { a: answered, b: data.questions.length })}</Badge>
        </div>
      </Card>
      {data.questions.map((q, i) => (
        <Card key={q.id}>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <p className="min-w-0 flex-1 text-sm font-semibold">{i + 1}. {q.prompt}</p>
            <Badge className="shrink-0">{t(KIND_LABEL_KEYS[q.kind] ?? "nav.vocabulary")}</Badge>
          </div>
          <div className="mt-2 grid gap-2" role="radiogroup" aria-label={t("placement.questionOf", { current: i + 1, total: data.questions.length })}>
            {q.choices.map((c, ci) => {
              const selected = answers[q.id] === ci;
              return (
                <button
                  key={ci}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-brand-600 bg-brand-50 font-medium text-brand-900 dark:border-brand-400 dark:bg-brand-950 dark:text-brand-100" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:border-brand-500 dark:hover:bg-ink-800"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="mt-2 text-xs font-medium text-ink-500 underline"
            onClick={() => setShowHints((h) => ({ ...h, [q.id]: !h[q.id] }))}
            aria-expanded={Boolean(showHints[q.id])}
          >
            {showHints[q.id] ? t("learn.hideHint") : t("learn.showHint")}
          </button>
          {showHints[q.id] && <p className="mt-1 text-xs text-ink-500">{q.hint}</p>}
        </Card>
      ))}
      {submitError && <Alert tone="danger" title={t("learn.submitFailed")}>{submitError}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting}>
          {t("learn.submitCount", { a: answered, b: data.questions.length })}
        </Button>
        {!allAnswered && <span className="text-xs text-ink-500">{t("learn.answerAllHint")}</span>}
      </div>
    </div>
  );
}
