"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { DAILY_GOAL_OPTIONS } from "@/lib/gamification/gamification";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { formatChallengeDate, formatXP } from "@/lib/i18n/format";

interface Achievement {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
}

interface Summary {
  xpToday: number;
  xpTotal: number;
  streak: { current: number; longest: number };
  dailyGoalXp: number;
  goalPct: number;
  goalDone: boolean;
  level: { name: string; nextMin: number | null; progressPct: number };
  stats: Record<string, number>;
  achievements: Achievement[];
  newlyEarned: string[];
  last7: Array<{ date: string; xp: number }>;
  skills: Array<{ skill: string; label: string; attempts: number; accuracyPct: number | null; href: string; note: string }>;
  weakAreas: Array<{ skill: string; label: string; reason: string; href: string }>;
  mastery: { count: number; avg: number | null; distribution: { fresh: number; learning: number; good: number; mastered: number } };
}

export function ProgressViews() {
  const { t, locale } = useTranslation();
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [goal, setGoal] = useState<number>(30);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalMsg, setGoalMsg] = useState<string | null>(null);

  // Load-once effect: error text uses the mount-time locale (no refetch on language switch).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/gamification/summary")
      .then(async (r) => {
        if (!r.ok) throw new Error("load");
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (json.signedIn === false) {
          setSignedOut(true);
          return;
        }
        setData(json);
        setGoal(json.dailyGoalXp);
      })
      .catch(() => {
        if (!cancelled) setError(t("progress.couldNotLoad"));
      });
    return () => {
      cancelled = true;
    };
    // Load-once: no refetch on language switch (error text uses mount-time locale).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveGoal() {
    setSavingGoal(true);
    setGoalMsg(null);
    try {
      const res = await fetch("/api/gamification/goal", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dailyGoalXp: goal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || t("common.couldNotSave"));
      setGoalMsg(t("progress.goalSaved"));
      setData((d) => (d ? { ...d, dailyGoalXp: goal, goalPct: Math.min(100, Math.round((d.xpToday / goal) * 100)), goalDone: d.xpToday >= goal } : d));
    } catch (e) {
      setGoalMsg(e instanceof Error ? e.message : t("common.couldNotSave"));
    } finally {
      setSavingGoal(false);
    }
  }

  if (signedOut) {
    return (
      <Card>
        <CardTitle>{t("progress.signinTitle")}</CardTitle>
        <CardDescription>{t("progress.signinDesc")}</CardDescription>
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
        <Alert tone="danger" title={t("progress.couldNotLoadTitle")}>{error}</Alert>
        <div className="mt-3"><Button variant="secondary" onClick={() => window.location.reload()}>{t("common.retry")}</Button></div>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card aria-busy="true" aria-label={t("progress.loadingTitle")}>
        <CardTitle>{t("progress.loadingTitle")}</CardTitle>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-ink-100" />)}
        </div>
      </Card>
    );
  }

  const unlocked = data.achievements.filter((a) => a.unlocked).length;
  const max7 = Math.max(1, ...data.last7.map((d) => d.xp));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{t("progress.level")}</CardTitle>
            <Badge tone="brand" className="shrink-0">{data.level.name}</Badge>
          </div>
          <CardDescription>{t("progress.totalXp", { total: data.xpTotal })}{data.level.nextMin !== null ? ` · ${t("progress.toNext", { n: data.level.nextMin - data.xpTotal })}` : ` · ${t("progress.maxLevel")}`}</CardDescription>
          <Progress value={data.level.progressPct} max={100} label={t("progress.toNextLevel", { pct: data.level.progressPct })} className="mt-3" />
        </Card>
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">🔥 {t("dashboard.cards.streak")}</CardTitle>
            {data.streak.current > 0 && <Badge tone="success" className="shrink-0">{t("progress.daysCount", { n: data.streak.current })}</Badge>}
          </div>
          <CardDescription>{t("progress.bestKeep", { n: data.streak.longest })}</CardDescription>
          <div className="mt-3 flex items-end gap-1.5" role="img" aria-label={`${t("progress.xpLast7")}: ${data.last7.map((d) => `${formatChallengeDate(locale, d.date)} ${formatXP(locale, d.xp)}`).join(", ")}`}>
            {data.last7.map((d) => (
              <div key={d.date} className="min-w-0 flex-1 text-center">
                <div
                  className={`mx-auto w-full rounded-t-md ${d.xp > 0 ? "bg-brand-500" : "bg-ink-100"}`}
                  style={{ height: `${Math.max(4, Math.round((d.xp / max7) * 48))}px` }}
                  title={`${formatChallengeDate(locale, d.date)}: ${formatXP(locale, d.xp)}`}
                />
                <p className="mt-1 truncate text-[10px] text-ink-400">{formatChallengeDate(locale, d.date)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{t("progress.dailyGoal")}</CardTitle>
            {data.goalDone ? <Badge tone="success" className="shrink-0">{t("progress.met")}</Badge> : <Badge className="shrink-0">{data.xpToday}/{data.dailyGoalXp} XP</Badge>}
          </div>
          <CardDescription>{t("progress.earnToday", { n: data.dailyGoalXp })}</CardDescription>
          <Progress value={data.xpToday} max={Math.max(1, data.dailyGoalXp)} label={`${data.goalPct}%`} className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("progress.goalOptions")}>
            {DAILY_GOAL_OPTIONS.map((g) => (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={goal === g}
                onClick={() => setGoal(g)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${goal === g ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"}`}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" onClick={saveGoal} loading={savingGoal}>{t("progress.saveGoal")}</Button>
            {goalMsg && <span className="text-xs text-ink-500">{goalMsg}</span>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("progress.skillScores")}</CardTitle>
          <Badge className="shrink-0">{t("progress.realActivity")}</Badge>
        </div>
        <CardDescription>{t("progress.skillScoresDesc")}</CardDescription>
        {(data.skills ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t("progress.noActivity")}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-3">
            {data.skills.map((s) => (
              <li key={s.skill} className="min-w-0 rounded-xl border border-ink-200/70 px-3 py-2.5">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{s.label}</p>
                  {s.accuracyPct !== null ? (
                    <Badge tone={s.accuracyPct >= 70 ? "success" : "warning"} className="shrink-0">{s.accuracyPct}%</Badge>
                  ) : (
                    <Badge className="shrink-0">—</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-ink-500">
                  {s.accuracyPct !== null ? `${s.note} · ${t("progress.attempts", { n: s.attempts })}` : `${t("progress.noAttempts")} · ${s.note}`}
                </p>
                <Link href={s.href as never} className="mt-1 inline-block text-xs font-semibold text-brand-700 underline">{t("progress.practiceBtn")}</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("progress.weakAreas")}</CardTitle>
          <Badge tone={(data.weakAreas ?? []).length > 0 ? "warning" : "success"} className="shrink-0">
            {(data.weakAreas ?? []).length === 0 ? t("progress.allClear") : t("progress.toWorkOn", { n: (data.weakAreas ?? []).length })}
          </Badge>
        </div>
        <CardDescription>{t("progress.weakDesc")}</CardDescription>
        {(data.weakAreas ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t("progress.nothingWeak")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.weakAreas.map((w) => (
              <li key={w.skill} className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{w.label}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{w.reason}</p>
                </div>
                <Link href={w.href as never} className="shrink-0 text-sm font-semibold text-brand-700 underline">{t("progress.practiceBtn")}</Link>
              </li>
            ))}
          </ul>
        )}
        {data.mastery && data.mastery.count > 0 && (
          <p className="mt-3 text-xs text-ink-500">
            {t("progress.dictStats", { n: data.mastery.count, avg: data.mastery.avg ?? "—", f: data.mastery.distribution.fresh, l: data.mastery.distribution.learning, g: data.mastery.distribution.good, m: data.mastery.distribution.mastered })}
          </p>
        )}
      </Card>

      <Card>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <CardTitle className="min-w-0 flex-1 truncate">{t("progress.achievements")}</CardTitle>
          <Badge tone={unlocked > 0 ? "success" : undefined} className="shrink-0">{t("progress.unlockedCount", { a: unlocked, b: data.achievements.length })}</Badge>
        </div>
        <CardDescription>{t("progress.achievementsDesc")}</CardDescription>
        {data.achievements.length === 0 ? (
          <p className="mt-3 text-sm text-ink-500">{t("progress.noAchievements")}</p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.achievements.map((a) => (
              <li
                key={a.key}
                className={`rounded-xl border px-3 py-2.5 ${a.unlocked ? "border-green-200 bg-green-50" : "border-ink-200 bg-ink-50 opacity-70"}`}
              >
                <p className="text-sm font-semibold">{a.unlocked ? "🏆 " : "🔒 "}{a.title}</p>
                <p className="mt-0.5 text-xs text-ink-500">{a.description}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>{t("progress.keepEarning")}</CardTitle>
        <CardDescription>{t("progress.keepEarningDesc")}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/spelling"><Button size="sm">{t("progress.practiceSpelling")}</Button></Link>
          <Link href="/daily-challenge"><Button size="sm" variant="secondary">{t("dashboard.dailyChallenge")}</Button></Link>
          <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("nav.vocabulary")}</Button></Link>
          <Link href="/dashboard"><Button size="sm" variant="ghost">{t("nav.dashboard")}</Button></Link>
        </div>
      </Card>
    </div>
  );
}
