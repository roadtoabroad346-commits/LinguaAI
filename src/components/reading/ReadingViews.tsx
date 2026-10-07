"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEVELS } from "@/lib/constants";
import type { ReadingPassage } from "@/lib/reading/library";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function ReadingList({ passages, words }: { passages: ReadingPassage[]; words: Record<string, number> }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return passages.filter((p) => {
      if (level !== "all" && p.level !== level) return false;
      if (!needle) return true;
      return p.title.toLowerCase().includes(needle);
    });
  }, [passages, level, query]);

  return (
    <div>
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input aria-label={t("learn.searchTitles")} placeholder={t("learn.searchTitles")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
            <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
              <option value="all">{t("learn.all")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: passages.length })} {t("learn.passagesUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
          action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.slug} className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{p.level}</Badge>
                <Badge>{t("modules.wordsCount", { count: words[p.slug] ?? 0 })}</Badge>
                <Badge>{t("learn.minLabel", { count: p.minutes })}</Badge>
              </div>
              <CardTitle className="mt-2">{p.title}</CardTitle>
              <CardDescription>{t("learn.focusWords")}: {p.vocabFocus.slice(0, 4).join(" · ")}</CardDescription>
              <div className="mt-3"><Link href={`/reading/${p.slug}`}><Button size="sm">{t("learn.readQuiz")}</Button></Link></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface PublicQ { id: string; prompt: string; choices: string[]; }

function highlight(text: string, focus: string[], seeLabel: (word: string) => string): React.ReactNode[] {
  const set = new Set(focus.map((w) => w.toLowerCase()));
  return text.split(/(\s+)/).map((tok, i) => {
    const clean = tok.toLowerCase().replace(/[^a-z]/g, "");
    if (clean && set.has(clean)) {
      return (
        <Link key={i} href={`/vocabulary/${clean}`}
          className="rounded bg-brand-50 px-0.5 font-medium text-brand-800 underline decoration-brand-200 underline-offset-2"
          title={seeLabel(clean)}>
          {tok}
        </Link>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

export function ReadingRunner({ slug, paragraphs, vocabFocus, questions }: {
  slug: string; paragraphs: string[]; vocabFocus: string[]; questions: PublicQ[];
}) {
  const { t } = useTranslation();
  const seeLabel = (word: string) => t("learn.seeInVocab", { word });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const answered = Object.keys(answers).length;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const selections = questions.map((x) => ({ questionId: x.id, selected: answers[x.id], choices: x.choices }));
      const res = await fetch("/api/reading/complete", {
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

  return (
    <div className="space-y-3">
      <Card>
        <CardTitle>{t("learn.passage")}</CardTitle>
        <CardDescription>{t("learn.passageDesc")}</CardDescription>
        <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-800">
          {paragraphs.map((para, i) => <p key={i}>{highlight(para, vocabFocus, seeLabel)}</p>)}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vocabFocus.map((w) => (
            <Link key={w} href={`/vocabulary/${w}`}><Badge tone="brand">{w}</Badge></Link>
          ))}
        </div>
      </Card>
      {result ? (
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfectComprehension") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.goodReading") : t("learn.goodEffort")}</CardTitle>
            <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
          </div>
          <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
            <Link href="/reading"><Button size="sm" variant="ghost">{t("learn.library")}</Button></Link>
          </div>
        </Card>
      ) : (
        <>
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
            <Button onClick={submit} loading={submitting} disabled={answered !== questions.length || submitting}>
              {t("learn.submitCount", { a: answered, b: questions.length })}
            </Button>
            {answered !== questions.length && <span className="text-xs text-ink-500">{t("learn.answerAllHint")}</span>}
          </div>
        </>
      )}
    </div>
  );
}
