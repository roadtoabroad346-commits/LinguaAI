import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Alert, Badge } from "@/components/ui/feedback";
import { PageTransition } from "@/lib/motion/components";
import { PageHero } from "@/components/learn/PageHero";
import { isSupabaseConfigured } from "@/lib/env";
import { getDashboardData } from "@/lib/dashboard/queries";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { formatXP } from "@/lib/i18n/format";
import { ContinueLearning, DailyChallengeCard, RecommendationsCard, SmartPathCard, StatsRow, WordOfDayCard } from "@/components/dashboard/DashboardCards";

export const dynamic = "force-dynamic";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabaseOk = isSupabaseConfigured();
  const data = await getDashboardData();
  if (supabaseOk && !data.signedIn) redirect("/login");

  const locale = await getEffectiveLocale();
  const t = getServerT(locale);

  const profile = data.profile;
  const needsOnboarding = profile && !profile.onboarding_completed;
  const needsPlacement = profile && profile.onboarding_completed && !profile.level;

  return (
    <AppShell>
      <PageTransition>
        <PageHero
          title={profile?.display_name ? t("dashboard.greeting", { name: profile.display_name }) : t("dashboard.title")}
          desc={profile?.learning_mode === "free" ? t("dashboard.freeDesc") : t("dashboard.guidedDesc")}
          badges={
            <>
              {profile?.level ? (
                <Badge tone="brand">{profile.level}</Badge>
              ) : (
                <Badge>{t("dashboard.unplaced")}</Badge>
              )}
              {profile?.learning_mode && (
                <Badge>{profile.learning_mode === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</Badge>
              )}
              {data.streak.current > 0 && (
                <Badge tone="success">🔥 {t("common.dayStreak", { count: data.streak.current })} · {formatXP(locale, data.xpTotal)}</Badge>
              )}
            </>
          }
        />

        {needsOnboarding && (
          <div className="mt-4">
            <Alert tone="brand" title={t("dashboard.finishSetup")}>
              <span className="mr-3">{t("dashboard.finishSetupDesc")}</span>
              <Link href="/onboarding" className="font-semibold underline">
                {t("dashboard.continueOnboarding")}
              </Link>
            </Alert>
          </div>
        )}
        {needsPlacement && (
          <div className="mt-4">
            <Alert tone="brand" title={t("dashboard.findLevel")}>
              <span className="mr-3">{t("dashboard.findLevelDesc")}</span>
              <Link href="/placement" className="font-semibold underline">
                {t("dashboard.startPlacement")}
              </Link>
            </Alert>
          </div>
        )}
        {!supabaseOk && (
          <div className="mt-4">
            <Alert tone="warning" title={t("dashboard.previewMode")}>
              {t("dashboard.previewModeDesc")}
            </Alert>
          </div>
        )}

        <div className="mt-6">
          <StatsRow data={data} />
        </div>

        <div className="mt-6">
          <ContinueLearning data={data} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <WordOfDayCard data={data} />
          <DailyChallengeCard data={data} />
        </div>

        <div className="mt-6">
          <SmartPathCard signedIn={data.signedIn} />
        </div>

        <div className="mt-4">
          <RecommendationsCard initial={data.recommendations} signedIn={data.signedIn} />
        </div>
      </PageTransition>
    </AppShell>
  );
}
