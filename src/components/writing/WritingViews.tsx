"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEVELS } from "@/lib/constants";
import { countWords, type WritingTask } from "@/lib/writing/tasks";
import { CriteriaBars } from "@/components/learn/CriteriaBars";
import type { Criterion } from "@/components/learn/CriteriaBars";
import { copyText } from "@/lib/clipboard";
import { newAttemptKey } from "@/lib/completions/client";
import { haptic } from "@/lib/motion/hooks";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type TaskSummary = Pick<WritingTask, "slug" | "level" | "title" | "kind" | "prompt" | "minWords" | "maxWords">;

export function WritingExplorer({ initialTasks }: { initialTasks: TaskSummary[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<TaskSummary | null>(null);
  const [history, setHistory] = useState<{ submissions: Array<{ task_slug: string; score: number; word_count: number; created_at: string }>; topErrors: Array<{ category: string; count: number }> } | null>(null);

  useEffect(() => {
    fetch("/api/writing/history").then((r) => r.json()).then((j) => {
      if (j.submissions) setHistory(j);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialTasks.filter((t) => {
      if (level !== "all" && t.level !== level) return false;
      if (!needle) return true;
      return t.title.toLowerCase().includes(needle) || t.prompt.toLowerCase().includes(needle);
    });
  }, [initialTasks, level, query]);

  if (active) return <WritingEditor task={active} onBack={() => setActive(null)} />;

  return (
    <div>
      {history && history.topErrors.length > 0 && (
        <Card className="mb-4">
          <CardTitle>{t("learn.frequentMistakes")}</CardTitle>
          <CardDescription>{t("learn.frequentMistakesDesc")}</CardDescription>
          <div className="mt-2 flex flex-wrap gap-2">
            {history.topErrors.map((e) => <Badge key={e.category} tone="warning">{e.category} · {e.count}</Badge>)}
          </div>
        </Card>
      )}
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input aria-label={t("learn.searchTasks")} placeholder={t("learn.searchTasks")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
            <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50">
              <option value="all">{t("learn.all")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: initialTasks.length })} {t("learn.tasksUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")} action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((task) => (
            <Card key={task.slug} className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">{task.level}</Badge>
                <Badge>{task.kind}</Badge>
                <Badge>{t("learn.wordsRange", { min: task.minWords, max: task.maxWords })}</Badge>
              </div>
              <CardTitle className="mt-2">{task.title}</CardTitle>
              <CardDescription>{task.prompt}</CardDescription>
              <div className="mt-3"><Button size="sm" onClick={() => setActive(task)}>{t("learn.startWriting")}</Button></div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface CheckResult {
  score: number; wordCount: number; corrections: Array<{ original: string; corrected: string; explanation: string; category: string }>;
  improvedText: string; improvedVariants?: Array<{ text: string }>;
  feedback: string[]; recommendations: string[]; xpEarned: number; saved: boolean; ai: boolean;
  criteria?: Criterion[]; verdict?: string; strengths?: string[]; priorityFix?: string | null;
}

const REWRITE_STYLES = [
  { titleKey: "learn.rewriteFaithful", descKey: "learn.rewriteFaithfulDesc" },
  { titleKey: "learn.rewriteFluent", descKey: "learn.rewriteFluentDesc" },
  { titleKey: "learn.rewriteAmbitious", descKey: "learn.rewriteAmbitiousDesc" },
] as const;

/** Rewrite style picker: up to 3 variants (faithful → fluent → ambitious) + working copy button. */
export function RewriteVariants({ variants, fallbackText }: { variants?: Array<{ text: string }>; fallbackText: string }) {
  const { t } = useTranslation();
  const list = variants && variants.length > 0 ? variants.slice(0, 3) : [{ text: fallbackText }];
  const [sel, setSel] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const safeSel = Math.min(sel, list.length - 1);
  const current = list[safeSel]?.text ?? fallbackText;

  async function copy() {
    setCopyError(false);
    const ok = await copyText(current);
    if (ok) {
      setCopied(true);
      haptic(10);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      setCopyError(true);
    }
  }

  return (
    <Card>
      <CardTitle>{t("learn.improvedVersion")}</CardTitle>
      {list.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("learn.improvedVersion")}>
          {list.map((_, i) => {
            const meta = REWRITE_STYLES[i] ?? REWRITE_STYLES[0];
            const active = i === safeSel;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => { setSel(i); setCopied(false); setCopyError(false); haptic(6); }}
                className={cn(
                  "touch-44 min-h-[44px] rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950"
                    : "border-ink-200 bg-white hover:border-ink-300 dark:border-ink-700 dark:bg-ink-900"
                )}
              >
                <span className={cn("font-semibold", active ? "text-brand-800 dark:text-brand-100" : "text-ink-700 dark:text-ink-200")}>
                  {t(meta.titleKey)}
                </span>
                <span className="block text-xs font-normal text-ink-500 dark:text-ink-400">{t(meta.descKey)}</span>
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-800 dark:text-ink-100">{current}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={copy} success={copied} className="touch-44 min-h-[44px]">
          {copied ? t("learn.copied") : t("learn.copyImproved")}
        </Button>
        {copyError && <span className="text-xs text-red-600 dark:text-red-400">{t("learn.copyFailed")}</span>}
      </div>
    </Card>
  );
}

export function WritingEditor({ task, onBack }: { task: TaskSummary; onBack: () => void }) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const words = countWords(text);
  const pct = task.minWords > 0 ? Math.min(100, Math.round((words / task.minWords) * 100)) : 0;
  // Same text re-checked (retry / double-click) reuses one key → XP once.
  // Editing the text starts a new attempt with a fresh key.
  const checkKey = useRef(newAttemptKey());
  useEffect(() => { checkKey.current = newAttemptKey(); }, [text]);

  async function check() {
    setChecking(true); setError(null);
    try {
      const res = await fetch("/api/writing/check", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ taskSlug: task.slug, text, idempotencyKey: checkKey.current }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.checkFailedDesc"));
      setResult(json);
    } catch (e) { setError(e instanceof Error ? e.message : t("learn.couldNotCheck")); }
    finally { setChecking(false); }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <CardTitle className="min-w-0">{t("learn.scoreOut", { score: result.score })}</CardTitle>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge tone={result.ai ? "brand" : "default"}>{result.ai ? t("learn.aiFeedback") : t("learn.ruleFeedback")}</Badge>
              <Badge tone="success">{result.saved ? t("learn.xpSavedShort", { xp: result.xpEarned }) : t("learn.xpPreviewShort", { xp: result.xpEarned })}</Badge>
            </div>
          </div>
          <div className="mt-2"><Progress value={result.score} label={t("learn.writingScore")} /></div>
          {result.verdict && <p className="mt-2 text-sm font-medium text-ink-800 dark:text-ink-100">{result.verdict}</p>}
          {result.priorityFix && (
            <div className="mt-2"><Alert tone="warning" title={t("learn.priorityFix")}>{result.priorityFix}</Alert></div>
          )}
          {result.strengths && result.strengths.length > 0 && (
            <ul className="mt-2 space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-sm text-ink-700">✓ {s}</li>)}</ul>
          )}
          <div className="mt-3 space-y-1">
            {result.feedback.map((f, i) => <p key={i} className="text-sm text-ink-700 dark:text-ink-200">• {f}</p>)}
          </div>
        </Card>
        {result.criteria && <CriteriaBars criteria={result.criteria} />}
        <Card>
          <CardTitle>{t("learn.corrections", { n: result.corrections.length })}</CardTitle>
          {result.corrections.length === 0 ? <CardDescription>{t("learn.noIssues")}</CardDescription> : (
            <ul className="mt-2 space-y-2">
              {result.corrections.map((c, i) => (
                <li key={i} className="rounded-xl border border-ink-200 p-3 text-sm dark:border-ink-700">
                  <div className="flex items-center gap-2"><Badge>{c.category}</Badge></div>
                  {c.original && <p className="mt-1 text-ink-500 line-through dark:text-ink-400">{c.original}</p>}
                  {c.corrected && <p className="font-medium text-ink-900 dark:text-ink-50">{c.corrected}</p>}
                  <p className="mt-1 text-ink-600 dark:text-ink-300">{c.explanation}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <RewriteVariants variants={result.improvedVariants} fallbackText={result.improvedText} />
        {result.recommendations.length > 0 && (
          <Card>
            <CardTitle>{t("learn.nextSteps")}</CardTitle>
            <ul className="mt-2 space-y-1">{result.recommendations.map((r, i) => <li key={i} className="text-sm text-ink-700 dark:text-ink-200">→ {r}</li>)}</ul>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setResult(null); }}>{t("learn.reviseRecheck")}</Button>
          <Button variant="ghost" onClick={onBack}>{t("learn.allTasks")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-medium text-brand-700 hover:underline">← {t("learn.allTasks")}</button>
      <Card>
        <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{task.level}</Badge><Badge>{task.kind}</Badge></div>
        <CardTitle className="mt-2">{task.title}</CardTitle>
        <CardDescription>{task.prompt}</CardDescription>
        <p className="mt-1 text-xs text-ink-500">{t("learn.targetRange", { min: task.minWords, max: task.maxWords })}</p>
      </Card>
      <Card>
        <label htmlFor="writing-text" className="mb-1.5 block text-sm font-medium text-ink-700">{t("learn.yourText")}</label>
        <textarea id="writing-text" rows={9} value={text} onChange={(e) => setText(e.target.value)}
          placeholder={t("learn.writeHere")} className="w-full rounded-xl border border-ink-200 bg-white p-3 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500" role="status">
          <span>{t("learn.wordsStatus", { n: words, min: task.minWords })}</span>
          <span>{words > task.maxWords ? t("learn.overLimit", { n: words - task.maxWords }) : t("learn.toGo", { n: Math.max(0, task.minWords - words) })}</span>
        </div>
        <div className="mt-2"><Progress value={pct} label={t("learn.targetProgress")} /></div>
        {error && <div className="mt-3"><Alert tone="danger" title={t("learn.checkFailed")}>{error}</Alert></div>}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={check} loading={checking} disabled={words < 10 || checking}>
            {words < 10 ? t("learn.writeMin", { n: words }) : t("learn.checkWriting")}
          </Button>
          <Button variant="ghost" size="sm" disabled={checking || !text} onClick={() => { setText(""); setError(null); }}>{t("common.clear")}</Button>
        </div>
      </Card>
    </div>
  );
}
