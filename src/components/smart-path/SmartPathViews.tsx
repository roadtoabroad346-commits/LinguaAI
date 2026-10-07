"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatChallengeDate } from "@/lib/i18n/format";

interface SmartStep {
  id: string;
  kind: string;
  skill: string;
  title: string;
  description: string;
  href: string;
  reason: string;
  xpEstimate: number;
  minutes: number;
  level: string | null;
}

interface PlanResponse {
  configured?: boolean;
  signedIn?: boolean;
  preview?: boolean;
  steps: SmartStep[];
  meta: { totalMinutes: number; totalXp: number; focusSkills: string[]; level: string | null; todayKey: string };
  signals: {
    weakAreas: Array<{ skill: string; label: string; reason: string; href: string }>;
    dueCount: number;
    totalWords: number;
    avgMastery: number | null;
    writingErrors: Array<{ category: string; count: number }>;
    misspelledWords: Array<{ word: string; misses: number }>;
    recentKinds: string[];
  } | null;
  reviewQueue: Array<{ word: string; mastery: number; nextReviewAt: string | null }>;
}

const KIND_TONE: Record<string, "brand" | "success" | "warning" | undefined> = {
  review: "warning",
  challenge: "brand",
  "weak-skill": "warning",
  mistakes: "warning",
  productive: "success",
  new: "brand",
  goal: undefined,
};

const KIND_LABEL_KEYS: Record<string, string> = {
  review: "smart.kindReview",
  challenge: "smart.kindChallenge",
  "weak-skill": "smart.kindWeak",
  mistakes: "smart.kindMistakes",
  productive: "smart.kindProductive",
  new: "smart.kindNew",
  goal: "smart.kindGoal",
};

export function SmartPathViews() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  // Load-once effect: error text uses the mount-time locale (no refetch on language switch).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/smart-path")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json: PlanResponse) => {
        if (cancelled) return;
        if (json.signedIn === false && !json.preview) {
          setSignedOut(true);
          return;
        }
        if (json.signedIn === false && json.preview && json.configured !== false) {
          setSignedOut(true);
          return;
        }
        setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(t("smart.couldNotLoad"));
      });
    return () => {
      cancelled = true;
    };
    // Load-once: no refetch on language switch (error text uses mount-time locale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (signedOut) {
    return (
      <Card>
        <CardTitle>{t("smart.unlock")}</CardTitle>
        <CardDescription>
          {t("smart.unlockDesc")}
        </CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/login"><Button size="sm">{t("auth.loginCta")}</Button></Link>
          <Link href="/signup"><Button size="sm" variant="secondary">{t("auth.signupCta")}</Button></Link>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert tone="danger" title={t("smart.couldNotLoadTitle")}>{error}</Alert>
        <div className="mt-3"><Button variant="secondary" onClick={() => window.location.reload()}>{t("common.retry")}</Button></div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card aria-busy="true" aria-label={t("smart.buildingTitle")}>
        <CardTitle>{t("smart.building")}</CardTitle>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-ink-100" />)}
        </div>
      </Card>
    );
  }

  if (data.steps.length === 0) {
    return (
      <Card>
        <CardTitle>{t("smart.nothingQueued")}</CardTitle>
        <CardDescription>{t("smart.nothingQueuedDesc")}</CardDescription>
        <div className="mt-3">
          <Link href="/vocabulary"><Button size="sm">{t("smart.startVocab")}</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>{t("smart.todayPlan")} · {formatChallengeDate(locale, data.meta.todayKey)}</CardTitle>
            <CardDescription>
              {t("dashboard.cards.minXpToday", { minutes: data.meta.totalMinutes, xp: data.meta.totalXp })}
              {data.meta.level ? ` · ${t("smart.levelIs", { level: data.meta.level })}` : ""}
              {data.preview ? ` · ${t("smart.previewTag")}` : ""}
            </CardDescription>
          </div>
          <Badge tone="brand" className="shrink-0">{data.meta.focusSkills.join(" · ") || t("smart.balanced")}</Badge>
        </div>
        <Progress
          value={data.meta.totalXp}
          max={Math.max(1, data.meta.totalXp)}
          label={t("smart.stepsPlanned", { n: data.steps.length })}
          className="mt-3"
        />
        <ol className="mt-4 space-y-3">
          {data.steps.map((s, i) => (
            <li
              key={s.id}
              className="flex items-start gap-3 rounded-xl border border-ink-200/70 p-3 transition-colors hover:border-brand-300"
            >
              <span
                aria-hidden
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <Badge tone={KIND_TONE[s.kind]}>{t(KIND_LABEL_KEYS[s.kind] ?? "smart.kindGoal")}</Badge>
                  {s.level && <Badge>{s.level}</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-ink-500">{s.description}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {t("smart.whyPrefix")}: {s.reason} · {t("dashboard.cards.minutes", { count: s.minutes })} · {s.xpEstimate} XP
                </p>
              </div>
              <Link href={s.href as never} className="shrink-0 text-sm font-semibold text-brand-700 underline">
                {t("dashboard.cards.start")}
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      {data.signals && (
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{t("smart.whyPath")}</CardTitle>
            <Badge className="shrink-0">{t("smart.adapts")}</Badge>
          </div>
          <CardDescription>
            {t("smart.adaptsDesc")}
          </CardDescription>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="rounded-xl bg-ink-50 px-3 py-2">
              <span className="font-semibold">{t("smart.reviewSchedule")} </span>
              {data.signals.dueCount > 0 ? (
                <span>{t("smart.dueWords", { due: data.signals.dueCount, total: data.signals.totalWords })}</span>
              ) : (
                <span>{data.signals.totalWords > 0 ? t("smart.nothingDue") : t("smart.saveWordsStart")}</span>
              )}
            </li>
            {data.signals.weakAreas.length > 0 && (
              <li className="rounded-xl bg-ink-50 px-3 py-2">
                <span className="font-semibold">{t("smart.weakSkills")} </span>
                {data.signals.weakAreas.map((w) => `${w.label} (${w.reason})`).join(" · ")}
              </li>
            )}
            {data.signals.avgMastery !== null && (
              <li className="rounded-xl bg-ink-50 px-3 py-2">
                <span className="font-semibold">{t("smart.vocabMastery")} </span>
                {t("smart.vocabMasteryDesc", { pct: data.signals.avgMastery, n: data.signals.totalWords })}
              </li>
            )}
            {data.signals.writingErrors.length > 0 && (
              <li className="rounded-xl bg-ink-50 px-3 py-2">
                <span className="font-semibold">{t("smart.writingPatterns")} </span>
                {t("smart.writingPatternsDesc")} — {data.signals.writingErrors.map((e) => `${e.category} (${e.count})`).join(", ")}.
              </li>
            )}
            {data.signals.misspelledWords.length > 0 && (
              <li className="rounded-xl bg-ink-50 px-3 py-2">
                <span className="font-semibold">{t("smart.spellingMisses")} </span>
                {data.signals.misspelledWords.map((m) => `“${m.word}” (${m.misses}×)`).join(", ")}.
              </li>
            )}
            {data.signals.recentKinds.length > 0 && (
              <li className="rounded-xl bg-ink-50 px-3 py-2">
                <span className="font-semibold">{t("smart.thisWeek")} </span>
                {data.signals.recentKinds.join(", ")} — {t("smart.thisWeekDesc")}
              </li>
            )}
          </ul>
          {data.reviewQueue.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-semibold">{t("smart.dueForReview")}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {data.reviewQueue.map((w) => (
                  <span key={w.word} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium">
                    {w.word} · {w.mastery}%
                  </span>
                ))}
              </div>
              <Link href="/flashcards" className="mt-2 inline-block text-xs font-semibold text-brand-700 underline">
                {t("smart.reviewInFlashcards")}
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
