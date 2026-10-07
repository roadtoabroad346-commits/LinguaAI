import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/feedback";
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
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/profile");

  const profile = await getSessionProfile();
  if (!profile) {
    return (
      <AppShell>
        <EmptyState
          title={t("profile.notFound")}
          description={t("profile.notFoundDesc")}
          action={
            <Link href="/auth/signout">
              <Button variant="secondary">{t("auth.signout")}</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight">{t("profile.title")}</h1>
        {profile.level && <Badge tone="brand">{profile.level}</Badge>}
        {profile.learning_mode && (
          <Badge>{profile.learning_mode === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</Badge>
        )}
      </div>
      <p className="mt-1 truncate text-sm text-ink-500">{user.email}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>{t("profile.account")}</CardTitle>
          <CardDescription>{t("profile.accountDesc")}</CardDescription>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">{t("common.levelLabel")}</dt>
              <dd className="font-medium">{profile.level ?? t("profile.notPlaced")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">{t("profile.placementScore")}</dt>
              <dd className="font-medium">
                {profile.placement_score !== null ? `${profile.placement_score}%` : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">{t("profile.dailyGoal")}</dt>
              <dd className="font-medium">{formatXP(locale, profile.daily_goal_xp)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-ink-500">{t("profile.onboarding")}</dt>
              <dd className="font-medium">{profile.onboarding_completed ? t("profile.complete") : t("profile.incomplete")}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/placement">
              <Button variant="secondary" size="sm">
                {profile.level ? t("profile.retake") : t("profile.takePlacement")}
              </Button>
            </Link>
            <Link href="/auth/signout">
              <Button variant="ghost" size="sm">
                {t("auth.signout")}
              </Button>
            </Link>
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
    </AppShell>
  );
}
