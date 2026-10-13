import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { AppearanceSettings } from "@/components/learn/AppearanceSettings";
import { PageHero } from "@/components/learn/PageHero";
import { getSessionProfile, getSessionUserResilient } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { formatXP } from "@/lib/i18n/format";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const locale = await getEffectiveLocale();
  const t = getServerT(locale);

  if (!isSupabaseConfigured()) {
    return (
      <AppShell>
        <Alert tone="warning" title={t("common.backendMissing")}>
          {t("common.backendMissingDesc")}
        </Alert>
      </AppShell>
    );
  }
  const user = await getSessionUserResilient();
  if (!user) redirect("/login?next=/profile");

  const profile = await getSessionProfile();
  if (!profile) {
    // New account (e.g. Google) whose profile row is not readable yet:
    // send to onboarding to create it — never to signout (that logged users out in a loop).
    redirect("/onboarding");
  }

  // Authoritative placement history (single source: placement_results, never profile copies).
  let attempts: Array<{
    id: string;
    level: string;
    score: number;
    total: number;
    skill_scores: Record<string, { score?: number; level?: string; answered?: boolean }> | null;
    created_at: string;
    test_version: string;
  }> = [];
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from("placement_results")
      .select("id,level,score,total,skill_scores,created_at,test_version")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    attempts = ((data ?? []) as typeof attempts) ?? [];
  } catch {
    attempts = [];
  }
  const latest = attempts[0] ?? null;

  return (
    <AppShell>
        <div className="flex items-center gap-3">
          <Avatar name={profile.display_name ?? user.email} size="lg" />
          <div className="min-w-0 flex-1">
            <PageHero
              title={t("profile.title")}
              desc={user.email ?? undefined}
              badges={
                <>
                  {profile.level && <Badge tone="brand">{profile.level}</Badge>}
                  {profile.learning_mode && (
                    <Badge>{profile.learning_mode === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</Badge>
                  )}
                </>
              }
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card interactive>
            <CardTitle>{t("profile.account")}</CardTitle>
            <CardDescription>{t("profile.accountDesc")}</CardDescription>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-500">{t("common.levelLabel")}</dt>
                <dd className="font-semibold">{profile.level ?? t("profile.notPlaced")}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-500">{t("profile.placementScore")}</dt>
                <dd className="font-semibold tabular-nums">
                  {profile.placement_score !== null ? `${profile.placement_score}%` : "—"}
                </dd>
              </div>
              {latest && (
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-500">{t("placement.yourLevel")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {latest.level} · {new Date(latest.created_at).toLocaleDateString(locale)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-ink-500">{t("profile.dailyGoal")}</dt>
                <dd className="font-semibold tabular-nums">{formatXP(locale, profile.daily_goal_xp)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-ink-500">{t("profile.onboarding")}</dt>
                <dd className="font-semibold">{profile.onboarding_completed ? t("profile.complete") : t("profile.incomplete")}</dd>
              </div>
            </dl>
            {latest?.skill_scores && typeof latest.skill_scores === "object" && (
              <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Latest placement skills">
                {Object.entries(latest.skill_scores)
                  .filter(([k, v]) => !k.startsWith("_") && v && (v as { answered?: boolean }).answered !== false)
                  .slice(0, 7)
                  .map(([k, v]) => (
                    <Badge key={k} tone="brand">
                      {k}: {(v as { level?: string }).level ?? (v as { score?: number }).score ?? "—"}
                    </Badge>
                  ))}
              </div>
            )}
            {attempts.length > 1 && (
              <div className="mt-3 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-600 dark:bg-ink-800 dark:text-ink-300">
                <p className="font-bold">{t("placement.reviewTitle")} · {attempts.length}</p>
                <ul className="mt-1 space-y-0.5 tabular-nums">
                  {attempts.map((a) => (
                    <li key={a.id}>
                      {new Date(a.created_at).toLocaleDateString(locale)} · {a.level} · {a.score}/{a.total} · {a.test_version}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!latest && (
              <p className="mt-3 text-xs text-ink-500">{t("placement.fillMore")}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard">
                <Button size="sm">
                  {t("nav.dashboard")}
                </Button>
              </Link>
              <Link href={profile.level ? "/placement?retake=1" : "/placement"}>
                <Button variant="secondary" size="sm">
                  {profile.level ? t("profile.retake") : t("profile.takePlacement")}
                </Button>
              </Link>
              <Link href="/onboarding?edit=1">
                <Button variant="ghost" size="sm">{t("profile.editProfile")}</Button>
              </Link>
              <Link href="/smart-path">
                <Button variant="ghost" size="sm">{t("placement.openSmartPath")}</Button>
              </Link>
              <Link href="/progress">
                <Button variant="ghost" size="sm">{t("nav.progress")}</Button>
              </Link>
              <SignOutButton variant="ghost" size="sm" />
            </div>
          </Card>
          <Card>
            <CardTitle>{t("profile.settingsTitle")}</CardTitle>
            <CardDescription>{t("profile.settingsDesc")}</CardDescription>
            <div className="mt-4">
              <ProfileForm
                profile={{
                  display_name: profile.display_name,
                  native_language: profile.native_language,
                  goals: profile.goals,
                  daily_goal_xp: profile.daily_goal_xp,
                  learning_mode: profile.learning_mode,
                  preferred_language: (profile as { preferred_language?: string }).preferred_language ?? null,
                  timezone: profile.timezone ?? "UTC",
                }}
              />
            </div>
          </Card>
        </div>
        <div className="mt-4">
          <AppearanceSettings />
        </div>
        <div className="mt-4" id="notifications">
          <NotificationSettings />
        </div>
    </AppShell>
  );
}
