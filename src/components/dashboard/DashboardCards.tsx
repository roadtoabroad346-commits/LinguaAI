"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, ArrowRight, Sparkles, BookOpen, Trophy } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { RingProgress } from "@/components/ui/Ring";
import { Stagger, StaggerItem, AnimatedNumber } from "@/lib/motion/components";
import { celebrate } from "@/lib/motion/celebrate";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatDate, formatXP } from "@/lib/i18n/format";
import type { DashboardData } from "@/lib/dashboard/queries";
import type { Recommendation } from "@/lib/dashboard/recommendations";

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
      <h2 className="font-display min-w-0 flex-1 truncate text-lg font-bold tracking-tight">{children}</h2>
      {action}
    </div>
  );
}

export function StatsRow({ data }: { data: DashboardData }) {
  const { t, locale } = useTranslation();
  const goalLabel = `${data.xpToday} / ${data.dailyGoalXp} XP`;
  const pct = Math.min(100, (data.xpToday / Math.max(1, data.dailyGoalXp)) * 100);

  useEffect(() => {
    if (data.goalDone && data.xpToday > 0) celebrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Stagger className="grid gap-3 sm:grid-cols-3">
      <StaggerItem>
        <Card interactive className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 to-amber-400" />
          <CardTitle>
            <Flame className="mr-1 inline h-4 w-4 text-orange-500" aria-hidden /> {t("dashboard.cards.streak")}
          </CardTitle>
          <CardDescription>
            {data.streak.longest > 0 ? t("dashboard.cards.bestDays", { count: data.streak.longest }) : t("dashboard.cards.practiceDaily")}
          </CardDescription>
          <p className="mt-2 text-3xl font-extrabold tabular-nums">
            <AnimatedNumber value={data.streak.current} />{" "}
            <span className="text-base font-medium text-ink-500">
              {data.streak.current === 1 ? t("dashboard.cards.day") : t("dashboard.cards.days")}
            </span>
          </p>
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card interactive className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 to-violet-500" />
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{t("dashboard.cards.xpToday")}</CardTitle>
            {data.goalDone && <Badge tone="success" className="shrink-0">{t("dashboard.cards.goalMet")}</Badge>}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <RingProgress
              value={data.xpToday}
              max={Math.max(1, data.dailyGoalXp)}
              size={56}
              stroke={7}
              label={<AnimatedNumber value={Math.round(pct)} />}
            />
            <div className="min-w-0">
              <p className="text-sm font-bold tabular-nums">{goalLabel}</p>
              <CardDescription>{t("dashboard.cards.totalXp", { count: data.xpTotal })}</CardDescription>
              <Link href="/progress" className="mt-1 inline-block text-xs font-semibold text-brand-700 underline">
                {t("dashboard.cards.viewProgress")}
              </Link>
            </div>
          </div>
          <Progress value={data.xpToday} max={Math.max(1, data.dailyGoalXp)} className="mt-3" />
        </Card>
      </StaggerItem>
      <StaggerItem>
        <Card interactive className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <CardTitle>{t("dashboard.cards.level")}</CardTitle>
          <CardDescription>
            {data.profile?.level ? t("dashboard.cards.placedScore", { score: data.profile.placement_score ?? "—" }) : t("dashboard.cards.findLevel")}
          </CardDescription>
          <p className="mt-3">
            {data.profile?.level ? (
              <Badge tone="brand" className="px-3 py-1 text-sm">{data.profile.level}</Badge>
            ) : (
              <Link href="/placement">
                <Button size="sm" shine>{t("dashboard.cards.takePlacement")}</Button>
              </Link>
            )}
          </p>
        </Card>
      </StaggerItem>
    </Stagger>
  );
}

export function ContinueLearning({ data }: { data: DashboardData }) {
  const { t, locale } = useTranslation();
  return (
    <section aria-label={t("dashboard.continueLearning")}>
      <SectionTitle action={<Link href="/smart-path" className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.viewPath")}</Link>}>
        {t("dashboard.continueLearning")}
      </SectionTitle>
      {data.recentActivity.length === 0 ? (
        <Card>
          <CardDescription>{t("dashboard.cards.noActivity")}</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/daily-challenge"><Button size="sm" shine>{t("dashboard.cards.startChallenge")}</Button></Link>
            <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("dashboard.cards.practiceWords")}</Button></Link>
          </div>
        </Card>
      ) : (
        <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
          {data.recentActivity.map((a) => (
            <motion.li key={a.id} whileTap={{ scale: 0.98 }} className="w-[86%] shrink-0 snap-start md:w-auto">
              <Card interactive className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{a.title}</p>
                    {a.subtitle && <p className="mt-0.5 truncate text-sm text-ink-500">{a.subtitle}</p>}
                    <p className="mt-1 text-xs text-ink-400">
                      {a.xp > 0 ? `+${formatXP(locale, a.xp)} · ` : ""}{formatDate(locale, a.created_at)}
                    </p>
                  </div>
                  {a.href && (
                    <Link href={a.href as never} className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">
                      {t("dashboard.cards.open")} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              </Card>
            </motion.li>
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
    <Card interactive className="relative h-full overflow-hidden">
      <div aria-hidden className="bg-mesh absolute inset-0 opacity-60" />
      <div className="relative">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
            <BookOpen className="h-4 w-4 shrink-0 text-brand-600" /> {t("dashboard.wordOfDay")}
          </CardTitle>
          <Badge tone="brand" className="shrink-0">{w.level}</Badge>
        </div>
        <p className="font-display mt-2 text-2xl font-extrabold tracking-tight">{w.word}</p>
        <p className="text-sm italic text-ink-500">{w.partOfSpeech}</p>
        <p className="mt-2 text-sm leading-relaxed">{w.definition}</p>
        <p className="mt-1 text-sm text-ink-500">“{w.example}”</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("dashboard.cards.practiceWords")}</Button></Link>
          <Link href="/dictionary"><Button size="sm" variant="ghost">{t("dashboard.cards.myDictionary")}</Button></Link>
        </div>
      </div>
    </Card>
  );
}

export function DailyChallengeCard({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  return (
    <Card interactive className="relative h-full overflow-hidden border-amber-200/70 dark:border-amber-900">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
          <Flame className="h-4 w-4 shrink-0 text-orange-500" /> {t("dashboard.dailyChallenge")}
        </CardTitle>
        {data.challengeDone ? (
          <Badge tone="success" className="shrink-0">{t("dashboard.cards.done")} · {data.challengeScore}/5</Badge>
        ) : (
          <Badge tone="warning" className="shrink-0">{t("dashboard.cards.questions")}</Badge>
        )}
      </div>
      <CardDescription>{data.challengeDone ? t("dashboard.cards.doneDesc") : t("dashboard.cards.challengeDesc")}</CardDescription>
      <div className="mt-4">
        <Link href="/daily-challenge">
          <Button size="md" variant={data.challengeDone ? "secondary" : "warm"} shine={!data.challengeDone} disabled={data.challengeDone && data.signedIn} className="w-full sm:w-auto">
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
        <CardTitle className="flex min-w-0 flex-1 items-center gap-1.5">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-600" /> {t("dashboard.recommendations")}
        </CardTitle>
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
      <ul className="no-scrollbar -mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-2 md:overflow-visible">
        {recs.map((r) => (
          <li key={r.id} className="w-[84%] shrink-0 snap-start md:w-auto">
            <div className="h-full rounded-2xl border border-ink-200/70 p-3.5 transition-colors hover:border-brand-300 dark:border-ink-700">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold">{r.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-500">{r.description}</p>
                  <p className="mt-1.5 text-xs font-medium text-ink-400">{r.reason} · +{r.xp} XP</p>
                </div>
                <Link href={r.href as never} className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">
                  {t("dashboard.cards.start")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
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
    <Card className="relative overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-600 via-violet-500 to-amber-400" />
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="flex min-w-0 flex-1 items-center gap-1.5 truncate">
          <Trophy className="h-4 w-4 shrink-0 text-amber-500" /> {t("dashboard.cards.smartPathToday")}
        </CardTitle>
        <Link href="/smart-path" className="flex shrink-0 items-center gap-1 text-sm font-bold text-brand-700">
          {t("dashboard.cards.viewFullPath")} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {!preview ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />)}
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
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-200/70 p-3 dark:border-ink-700">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="bg-brand-gradient flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{s.title}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-400">{s.reason} · {t("dashboard.cards.minutes", { count: s.minutes })}</p>
                  </div>
                </div>
                <Link href={s.href as never} className="shrink-0 text-sm font-bold text-brand-700">
                  {t("dashboard.cards.start")}
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}
