"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatDate, formatXP } from "@/lib/i18n/format";
import type { DashboardData } from "@/lib/dashboard/queries";
import type { Recommendation } from "@/lib/dashboard/recommendations";

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
      <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function StatsRow({ data }: { data: DashboardData }) {
  const { t, locale } = useTranslation();
  const goalLabel = `${data.xpToday} / ${data.dailyGoalXp} XP`;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardTitle>
          <span aria-hidden className="mr-1">🔥</span> {t("dashboard.cards.streak")}
        </CardTitle>
        <CardDescription>{data.streak.longest > 0 ? t("dashboard.cards.bestDays", { count: data.streak.longest }) : t("dashboard.cards.practiceDaily")}</CardDescription>
        <p className="mt-2 text-3xl font-bold tabular-nums">
          {data.streak.current} <span className="text-base font-medium text-ink-500">{data.streak.current === 1 ? t("dashboard.cards.day") : t("dashboard.cards.days")}</span>
        </p>
      </Card>
      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("dashboard.cards.xpToday")}</CardTitle>
          {data.goalDone && <Badge tone="success" className="shrink-0">{t("dashboard.cards.goalMet")}</Badge>}
        </div>
        <CardDescription>{t("dashboard.cards.totalXp", { count: data.xpTotal })}</CardDescription>
        <Progress value={data.xpToday} max={Math.max(1, data.dailyGoalXp)} label={goalLabel} className="mt-3" />
        <Link href="/progress" className="mt-2 inline-block text-xs font-semibold text-brand-700 underline">{t("dashboard.cards.viewProgress")}</Link>
      </Card>
      <Card>
        <CardTitle>{t("dashboard.cards.level")}</CardTitle>
        <CardDescription>{data.profile?.level ? t("dashboard.cards.placedScore", { score: data.profile.placement_score ?? "—" }) : t("dashboard.cards.findLevel")}</CardDescription>
        <p className="mt-2">
          {data.profile?.level ? (
            <Badge tone="brand">{data.profile.level}</Badge>
          ) : (
            <Link href="/placement"><Button size="sm">{t("dashboard.cards.takePlacement")}</Button></Link>
          )}
        </p>
      </Card>
    </div>
  );
}

export function ContinueLearning({ data }: { data: DashboardData }) {
  const { t, locale } = useTranslation();
  return (
    <section aria-label={t("dashboard.continueLearning")}>
      <SectionTitle action={<Link href="/guided-path" className="shrink-0 text-sm font-medium text-brand-700 underline">{t("dashboard.cards.viewPath")}</Link>}>
        {t("dashboard.continueLearning")}
      </SectionTitle>
      {data.recentActivity.length === 0 ? (
        <Card><CardDescription>{t("dashboard.cards.noActivity")}</CardDescription></Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {data.recentActivity.map((a) => (
            <li key={a.id}>
              <Card className="transition-colors hover:border-brand-300">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{a.title}</p>
                    {a.subtitle && <p className="mt-0.5 truncate text-sm text-ink-500">{a.subtitle}</p>}
                    <p className="mt-1 text-xs text-ink-400">
                      {a.xp > 0 ? `+${formatXP(locale, a.xp)} · ` : ""}{formatDate(locale, a.created_at)}
                    </p>
                  </div>
                  {a.href && <Link href={a.href as never} className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.open")}</Link>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WordOfDayCard({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const w = data.wordOfDay;
  return (
    <Card>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1 truncate">{t("dashboard.wordOfDay")}</CardTitle>
        <Badge tone="brand" className="shrink-0">{w.level}</Badge>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{w.word}</p>
      <p className="text-sm italic text-ink-500">{w.partOfSpeech}</p>
      <p className="mt-2 text-sm">{w.definition}</p>
      <p className="mt-1 text-sm text-ink-500">“{w.example}”</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("dashboard.cards.practiceWords")}</Button></Link>
        <Link href="/dictionary"><Button size="sm" variant="ghost">{t("dashboard.cards.myDictionary")}</Button></Link>
      </div>
    </Card>
  );
}

export function DailyChallengeCard({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  return (
    <Card>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1 truncate">{t("dashboard.dailyChallenge")}</CardTitle>
        {data.challengeDone ? <Badge tone="success" className="shrink-0">{t("dashboard.cards.done")} · {data.challengeScore}/5</Badge> : <Badge tone="warning" className="shrink-0">{t("dashboard.cards.questions")}</Badge>}
      </div>
      <CardDescription>{data.challengeDone ? t("dashboard.cards.doneDesc") : t("dashboard.cards.challengeDesc")}</CardDescription>
      <div className="mt-3">
        <Link href="/daily-challenge">
          <Button size="sm" disabled={data.challengeDone && data.signedIn}>
            {data.challengeDone ? t("dashboard.cards.completedToday") : t("dashboard.cards.startChallenge")}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export function RecommendationsCard({ initial, signedIn }: { initial: Recommendation[]; signedIn: boolean }) {
  const { t } = useTranslation();
  const [recs, setRecs] = useState<Recommendation[]>(initial);
  const [state, setState] = useState<"idle" | "loading" | "ai" | "error">("idle");

  async function personalize() {
    setState("loading");
    try {
      const res = await fetch("/api/recommendations", { method: "POST" });
      const json = await res.json();
      if (Array.isArray(json.recommendations) && json.recommendations.length > 0) {
        setRecs(json.recommendations);
        setState(json.ai ? "ai" : "idle");
        if (!json.ai) setState("error");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <Card>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1">{t("dashboard.recommendations")}</CardTitle>
        <div className="flex shrink-0 items-center gap-2">
          {state === "ai" ? <Badge tone="success">{t("dashboard.cards.aiPicks")}</Badge> : <Badge>{t("dashboard.cards.ruleBased")}</Badge>}
          <Button size="sm" variant="secondary" loading={state === "loading"} disabled={state === "loading"} onClick={personalize}>
            {t("dashboard.cards.personalizeAI")}
          </Button>
        </div>
      </div>
      {state === "error" && (
        <div className="mt-2"><Alert tone="warning" title={t("dashboard.cards.aiUnavailable")}>{t("dashboard.cards.aiUnavailableDesc")}</Alert></div>
      )}
      {!signedIn && <CardDescription>{t("dashboard.cards.signInForPicks")}</CardDescription>}
      <ul className="mt-3 space-y-3">
        {recs.map((r) => (
          <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-ink-200/70 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="mt-0.5 text-sm text-ink-500">{r.description}</p>
              <p className="mt-1 text-xs text-ink-400">{r.reason} · +{r.xp} XP</p>
            </div>
            <Link href={r.href as never} className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.start")}</Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

interface SmartPathPreview {
  steps: Array<{ id: string; title: string; href: string; reason: string; minutes: number; xpEstimate: number }>;
  meta: { totalMinutes: number; totalXp: number };
}

/** Compact Smart Path preview for the dashboard (client-fetched, hides gracefully). */
export function SmartPathCard({ signedIn }: { signedIn: boolean }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<SmartPathPreview | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/smart-path")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json && Array.isArray(json.steps)) setPreview({ steps: json.steps.slice(0, 3), meta: json.meta });
      })
      .catch(() => {
        // Non-fatal: the static fallback below stays visible.
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!signedIn) return null;

  return (
    <Card>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1 truncate">{t("dashboard.cards.smartPathToday")}</CardTitle>
        <Link href="/smart-path" className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.viewFullPath")}</Link>
      </div>
      {!preview ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-ink-100" />)}
        </div>
      ) : preview.steps.length === 0 ? (
        <CardDescription>{t("dashboard.cards.adaptiveEmpty")}</CardDescription>
      ) : (
        <>
          <CardDescription>
            {t("dashboard.cards.minXpToday", { minutes: preview.meta.totalMinutes, xp: preview.meta.totalXp })}
          </CardDescription>
          <ol className="mt-3 space-y-2">
            {preview.steps.map((s, i) => (
              <li key={s.id} className="flex items-start justify-between gap-3 rounded-xl border border-ink-200/70 p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{i + 1}. {s.title}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-400">{s.reason} · {t("dashboard.cards.minutes", { count: s.minutes })}</p>
                </div>
                <Link href={s.href as never} className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.start")}</Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}
