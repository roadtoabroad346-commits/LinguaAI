import { AppShell } from "@/components/layout/AppShell";
import { DailyChallengeRunner } from "@/components/dashboard/DailyChallengeRunner";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Daily Challenge" };

export default async function DailyChallengePage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("dashboard.dailyChallenge")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.dailyChallengeSub")}
      </p>
      <div className="mt-6">
        <DailyChallengeRunner />
      </div>
    </AppShell>
  );
}
