"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface PublicQ {
  id: string;
  word: string;
  prompt: string;
  choices: string[];
}

export function PracticeRunner() {
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<PublicQ[] | null>(null);
  const [meta, setMeta] = useState({ xpPerCorrect: 5, bonusXp: 10, level: "mixed", signedIn: false });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; correctWords: string[]; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load-once effect: error text uses the mount-time locale (no refetch on language switch).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/vocab/practice?seed=${new Date().toISOString().slice(0, 10)}-${Math.floor(Math.random() * 100000)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        setQuestions(json.questions ?? []);
        setMeta({ xpPerCorrect: json.xpPerCorrect ?? 5, bonusXp: json.bonusXp ?? 10, level: json.level ?? "mixed", signedIn: json.signedIn ?? false });
      })
      .catch(() => {
        if (!cancelled) setLoadError(t("learn.couldNotLoadPractice"));
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
        <Alert tone="danger" title={t("learn.couldNotLoadTitle")}>{loadError}</Alert>
        <div className="mt-3"><Button variant="secondary" onClick={() => window.location.reload()}>{t("common.retry")}</Button></div>
      </Card>
    );
  }

  if (!questions) {
    return (
      <Card aria-busy="true" aria-label={t("learn.loadingQuiz")}>
        <CardTitle>{t("learn.loadingQuiz")}</CardTitle>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100" />)}
        </div>
      </Card>
    );
  }

  if (result) {
    return (
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfectScore") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.wellDone") : t("learn.goodEffort")}</CardTitle>
          <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"}>{result.score}/{result.total}</Badge>
        </div>
        <CardDescription>
          {result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}{" "}
          {t("learn.masteryNudge")}
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("learn.practiceAgain")}</Button>
          <Link href="/flashcards"><Button size="sm">{t("learn.reviewFlashcards")}</Button></Link>
          <Link href="/dictionary"><Button size="sm" variant="ghost">{t("nav.dictionary")}</Button></Link>
        </div>
      </Card>
    );
  }

  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const selections = questions!.map((q) => ({ word: q.word, selected: answers[q.id], choices: q.choices }));
      const res = await fetch("/api/vocab/practice/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selections }),
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
            <CardTitle>{t("learn.vocabPractice")} · {t("learn.practiceLevel", { level: meta.level })}</CardTitle>
            <CardDescription>{t("learn.quizMeta", { n: questions.length, xp: meta.xpPerCorrect, bonus: meta.bonusXp })}</CardDescription>
          </div>
          <Badge className="shrink-0">{t("learn.answeredCount", { a: answered, b: questions.length })}</Badge>
        </div>
      </Card>
      {questions.map((q, i) => (
        <Card key={q.id}>
          <p className="text-sm font-semibold">{i + 1}. {q.prompt}</p>
          <div className="mt-2 grid gap-2" role="radiogroup" aria-label={t("placement.questionOf", { current: i + 1, total: questions.length })}>
            {q.choices.map((c, ci) => {
              const selected = answers[q.id] === ci;
              return (
                <button
                  key={ci}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${selected ? "border-brand-600 bg-brand-50 font-medium" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50"}`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Card>
      ))}
      {submitError && <Alert tone="danger" title={t("learn.submitFailed")}>{submitError}</Alert>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting}>
          {t("learn.submitCount", { a: answered, b: questions.length })}
        </Button>
        {!allAnswered && <span className="text-xs text-ink-500">{t("learn.answerAllHint")}</span>}
      </div>
    </div>
  );
}
