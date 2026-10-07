"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEVELS } from "@/lib/constants";
import type { GrammarTopic } from "@/lib/grammar/topics";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function GrammarList({ topics }: { topics: GrammarTopic[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return topics.filter((t) => {
      if (level !== "all" && t.level !== level) return false;
      if (!needle) return true;
      return t.title.toLowerCase().includes(needle) || t.summary.toLowerCase().includes(needle);
    });
  }, [topics, level, query]);

  return (
    <div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input aria-label={t("learn.searchTopics")} placeholder={t("learn.searchTopics")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
            <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
              <option value="all">{t("learn.all")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: topics.length })} {t("learn.topicsUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
            action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((topic) => (
            <Card key={topic.slug} className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{topic.level}</Badge>
                <Badge>{t("learn.questionsCount", { count: topic.questions.length })}</Badge>
              </div>
              <CardTitle className="mt-2">{topic.title}</CardTitle>
              <CardDescription>{topic.summary}</CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/grammar/${topic.slug}`}><Button size="sm">{t("learn.studyPractice")}</Button></Link>
              </div>
            </Card>
          ))}
        </div>
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
    } catch (e) {
      setError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfect") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.wellDone") : t("learn.keepPracticing")}</CardTitle>
          <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"}>{result.score}/{result.total}</Badge>
        </div>
        <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
          <Link href="/grammar"><Button size="sm" variant="ghost">{t("learn.allTopics")}</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
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
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting}>
          {t("learn.submitCount", { a: answered, b: questions.length })}
        </Button>
        {!allAnswered && <span className="text-xs text-ink-500">{t("learn.answerAllHint")}</span>}
      </div>
    </div>
  );
}
