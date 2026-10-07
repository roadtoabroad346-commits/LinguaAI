"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { PartyPopper, Type } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress, Chip } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Sheet } from "@/components/ui/Sheet";
import { QuizOption } from "@/components/learn/QuizOption";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { PageTransition, Stagger, StaggerItem } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { LEVELS } from "@/lib/constants";
import type { ReadingPassage } from "@/lib/reading/library";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

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
      <div className="sticky top-16 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur dark:bg-ink-950/90">
        <Input aria-label={t("learn.searchTitles")} placeholder={t("learn.searchTitles")} value={query} onChange={(e) => setQuery(e.target.value)} className="shadow-card" />
        <div className="no-scrollbar -mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label={t("learn.level")}>
          {["all", ...LEVELS].map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
              {l === "all" ? t("learn.all") : l}
            </Chip>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs font-medium text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: passages.length })} {t("learn.passagesUnit")}</p>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")}
          action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <Stagger className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <StaggerItem key={p.slug}>
              <Card interactive className="flex h-full min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{p.level}</Badge>
                  <Badge>{t("modules.wordsCount", { count: words[p.slug] ?? 0 })}</Badge>
                  <Badge>{t("learn.minLabel", { count: p.minutes })}</Badge>
                </div>
                <CardTitle className="mt-2">{p.title}</CardTitle>
                <CardDescription className="line-clamp-2">{t("learn.focusWords")}: {p.vocabFocus.slice(0, 4).join(" · ")}</CardDescription>
                <div className="mt-3"><Link href={`/reading/${p.slug}`}><Button size="sm" shine className="w-full sm:w-auto">{t("learn.readQuiz")}</Button></Link></div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </div>
  );
}

interface PublicQ { id: string; prompt: string; choices: string[]; }

export function ReadingRunner({ slug, paragraphs, vocabFocus, questions }: {
  slug: string; paragraphs: string[]; vocabFocus: string[]; questions: PublicQ[];
}) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; xpEarned: number; perfect: boolean; saved: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [peek, setPeek] = useState<string | null>(null);
  const answered = Object.keys(answers).length;

  const textClass = fontSize === "sm" ? "text-[15px]" : fontSize === "lg" ? "text-[19px] leading-loose" : "text-[17px] leading-relaxed";

  function highlight(text: string): React.ReactNode[] {
    const set = new Set(vocabFocus.map((w) => w.toLowerCase()));
    return text.split(/(\s+)/).map((tok, i) => {
      const clean = tok.toLowerCase().replace(/[^a-z]/g, "");
      if (clean && set.has(clean)) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => setPeek(clean)}
            className="rounded-md bg-brand-100 px-1 font-semibold text-brand-800 underline decoration-brand-300 underline-offset-2 dark:bg-brand-950 dark:text-brand-200"
          >
            {tok}
          </button>
        );
      }
      return <span key={i}>{tok}</span>;
    });
  }

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
      if (json.perfect) celebrate({ big: true, force: true });
      else celebrate();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-2xl">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{t("learn.passage")}</CardTitle>
            <div className="flex items-center gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800" role="group" aria-label="Text size">
              <Type className="ml-1 h-4 w-4 text-ink-400" />
              {(["sm", "md", "lg"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  aria-pressed={fontSize === s}
                  className={cn(
                    "touch-44 flex h-8 w-9 items-center justify-center rounded-xl text-xs font-bold",
                    fontSize === s ? "bg-white text-ink-900 shadow dark:bg-ink-700 dark:text-white" : "text-ink-500"
                  )}
                >
                  {s === "sm" ? "S" : s === "md" ? "M" : "L"}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>{t("learn.passageDesc")}</CardDescription>
          <div className={cn("mt-3 max-w-prose space-y-3 text-ink-800 dark:text-ink-100", textClass)}>
            {paragraphs.map((para, i) => <p key={i}>{highlight(para)}</p>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vocabFocus.map((w) => (
              <button key={w} onClick={() => setPeek(w)}>
                <Badge tone="brand">{w}</Badge>
              </button>
            ))}
          </div>
        </Card>
        {result ? (
          <Card className="mt-3 text-center">
            {result.perfect && (
              <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="bg-brand-gradient mx-auto flex h-16 w-16 items-center justify-center rounded-3xl text-white shadow-pop">
                <PartyPopper className="h-7 w-7" />
              </motion.div>
            )}
            <div className="mt-3 flex min-w-0 items-center justify-center gap-2">
              <CardTitle className="font-display text-xl">{result.perfect ? t("learn.perfectComprehension") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.goodReading") : t("learn.goodEffort")}</CardTitle>
              <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
            </div>
            <CardDescription>{result.saved ? t("learn.xpSaved", { xp: result.xpEarned }) : t("learn.xpPreview", { xp: result.xpEarned })}</CardDescription>
            <Progress value={(result.score / Math.max(1, result.total)) * 100} tone={result.perfect ? "success" : "brand"} className="mx-auto mt-3 max-w-xs" />
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="md" variant="secondary" onClick={() => window.location.reload()}>{t("learn.tryAgain")}</Button>
              <Link href="/reading"><Button size="md" variant="ghost">{t("learn.library")}</Button></Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="mt-3 space-y-3">
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
                {answered !== questions.length ? t("learn.answerAllHint") : t("learn.readyToSubmit")}
              </div>
              <Button onClick={submit} loading={submitting} disabled={answered !== questions.length || submitting} shine size="lg" className="flex-1">
                {t("learn.submitCount", { a: answered, b: questions.length })}
              </Button>
            </StickyActionBar>
          </>
        )}
        <Sheet open={peek !== null} onClose={() => setPeek(null)} title={peek ?? ""}>
          {peek && (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">Tap below to open the full word page with mastery, examples and audio.</p>
              <Link href={`/vocabulary/${peek}`}>
                <Button shine className="w-full">Open “{peek}” in vocabulary</Button>
              </Link>
            </div>
          )}
        </Sheet>
      </div>
    </PageTransition>
  );
}
