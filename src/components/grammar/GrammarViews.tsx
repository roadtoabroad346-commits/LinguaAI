"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress, Chip } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { PageTransition, Stagger, StaggerItem } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { LEVELS } from "@/lib/constants";
import type { GrammarTopic } from "@/lib/grammar/topics";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function GrammarList({ topics }: { topics: GrammarTopic[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return topics.filter((x) => {
      if (level !== "all" && x.level !== level) return false;
      if (!needle) return true;
      return x.title.toLowerCase().includes(needle) || x.summary.toLowerCase().includes(needle);
    });
  }, [topics, level, query]);

  return (
    <div>
      <div className="sticky top-16 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur dark:bg-ink-950/90">
        <Input aria-label={t("learn.searchTopics")} placeholder={t("learn.searchTopics")} value={query} onChange={(e) => setQuery(e.target.value)} className="shadow-card" />
        <div className="no-scrollbar -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("learn.level")}>
          {["all", ...LEVELS].map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? t("learn.all") : l}
            </Chip>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: topics.length })} {t("learn.topicsUnit")}</p>
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
            action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} />
        </div>
      ) : (
        <Stagger className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((topic) => (
            <StaggerItem key={topic.slug}>
              <Card interactive className="flex h-full min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{topic.level}</Badge>
                  <Badge>{t("learn.questionsCount", { count: topic.questions.length })}</Badge>
                </div>
                <CardTitle className="mt-2">{topic.title}</CardTitle>
                <CardDescription className="line-clamp-2">{topic.summary}</CardDescription>
                <div className="mt-3">
                  <Link href={`/grammar/${topic.slug}`}><Button size="sm" shine className="w-full sm:w-auto">{t("learn.studyPractice")}</Button></Link>
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

export function GrammarRunner({ slug, questions }: { slug: string; questions: PublicQ[] }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answered = Object.keys(answers).length;
  const allAnswered = answered === questions.length;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const selections = questions.map((x) => ({ questionId: x.id, selected: answers[x.id], choices: x.choices }));
      const res = await fetch("/api/grammar/complete", {
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

  if (result) {
    return (
      <PageTransition>
        <Card className="text-center">
          {result.perfect && (
            <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="bg-brand-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-pop">
              <PartyPopper className="h-7 w-7" />
            </motion.div>
          )}
          <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
            <CardTitle className="font-display text-xl">{result.perfect ? t("learn.perfect") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.wellDone") : t("learn.keepPracticing")}</CardTitle>
            <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"}>{result.score}/{result.total}</Badge>
          </div>
          <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
          <Progress value={(result.score / Math.max(1, result.total)) * 100} tone={result.perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="md" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
            <Link href="/grammar"><Button size="md" variant="ghost">{t("learn.allTopics")}</Button></Link>
          </div>
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl">
        <Progress value={(answered / Math.max(1, questions.length)) * 100} label={`${answered}/${questions.length}`} className="mb-3" />
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
            {!allAnswered ? t("learn.answerAllHint") : t("learn.readyToSubmit")}
          </div>
          <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting} shine size="lg" className="flex-1">
            {t("learn.submitCount", { a: answered, b: questions.length })}
          </Button>
        </StickyActionBar>
      </div>
    </PageTransition>
  );
}
