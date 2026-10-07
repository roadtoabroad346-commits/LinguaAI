"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { PageTransition, Reveal } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
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
        <div className="mt-4 space-y-2.5" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />)}
        </div>
      </Card>
    );
  }

  if (result) {
    if (result.perfect) celebrate({ big: true });
    return (
      <PageTransition>
        <Card className="text-center">
          {result.perfect && (
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="bg-brand-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-pop">
              <PartyPopper className="h-7 w-7" />
            </motion.div>
          )}
          <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
            <CardTitle className="font-display text-xl">{result.perfect ? t("learn.perfectScore") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.wellDone") : t("learn.goodEffort")}</CardTitle>
            <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"}>{result.score}/{result.total}</Badge>
          </div>
          <CardDescription>
            {result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}{" "}
            {t("learn.masteryNudge")}
          </CardDescription>
          <Progress value={(result.score / Math.max(1, result.total)) * 100} tone={result.perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="md" variant="secondary" onClick={() => window.location.reload()}>{t("learn.practiceAgain")}</Button>
            <Link href="/flashcards"><Button size="md" shine>{t("learn.reviewFlashcards")}</Button></Link>
            <Link href="/dictionary"><Button size="md" variant="ghost">{t("nav.dictionary")}</Button></Link>
          </div>
        </Card>
      </PageTransition>
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
      if (json.perfect) celebrate({ big: true, force: true });
      else celebrate();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <CardTitle>{t("learn.vocabPractice")} · {t("learn.practiceLevel", { level: meta.level })}</CardTitle>
              <CardDescription>{t("learn.quizMeta", { n: questions.length, xp: meta.xpPerCorrect, bonus: meta.bonusXp })}</CardDescription>
            </div>
            <Badge tone={allAnswered ? "success" : "default"} className="shrink-0 tabular-nums">{t("learn.answeredCount", { a: answered, b: questions.length })}</Badge>
          </div>
          <Progress value={(answered / Math.max(1, questions.length)) * 100} className="mt-3" />
        </Card>
        <div className="mt-3 space-y-3">
          {questions.map((q, i) => (
            <Reveal key={q.id}>
              <Card>
                <p className="text-[15px] font-bold leading-snug">{i + 1}. {q.prompt}</p>
                <p className="mt-0.5 text-xs text-ink-400">{q.word} · {t("learn.pickCorrect") ?? ""}</p>
                <div className="mt-3 grid gap-2" role="radiogroup" aria-label={t("placement.questionOf", { current: i + 1, total: questions.length })}>
                  {q.choices.map((c, ci) => (
                    <QuizOption
                      key={ci}
                      label={c}
                      prefix={String.fromCharCode(65 + ci)}
                      state={answers[q.id] === ci ? "selected" : "idle"}
                      checked={answers[q.id] === ci}
                      onSelect={() => setAnswers((a) => ({ ...a, [q.id]: ci }))}
                    />
                  ))}
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
        {submitError && <div className="mt-3"><Alert tone="danger" title={t("learn.submitFailed")}>{submitError}</Alert></div>}
        <StickyActionBar className="mt-4">
          <div className="min-w-0 flex-1 px-2 text-xs font-medium text-ink-500">
            {allAnswered ? t("learn.readyToSubmit") : t("learn.answerAllHint")}
          </div>
          <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting} shine size="lg" className="flex-1">
            {t("learn.submitCount", { a: answered, b: questions.length })}
          </Button>
        </StickyActionBar>
      </div>
    </PageTransition>
  );
}
