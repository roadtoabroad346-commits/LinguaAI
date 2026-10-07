import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/feedback";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const t = getServerT(await getEffectiveLocale());

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen">
        <Header right={<LanguageSwitcher />} />
        <main className="mx-auto max-w-lg px-4 py-12">
          <Alert tone="warning" title={t("common.backendMissing")}>
            {t("common.backendMissingDesc")}
          </Alert>
        </main>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getSessionProfile();
  if (profile?.onboarding_completed) redirect("/placement");

  return (
    <div className="min-h-screen">
      <Header right={<LanguageSwitcher />} />
      <main className="mx-auto max-w-lg px-4 py-12">
        <OnboardingWizard
          initial={{
            displayName: profile?.display_name ?? "",
            nativeLanguage: profile?.native_language ?? "",
            goals: profile?.goals ?? [],
            dailyGoalXp: profile?.daily_goal_xp ?? 30,
            learningMode: profile?.learning_mode ?? "guided",
            preferredLanguage: (profile as { preferred_language?: string } | null)?.preferred_language ?? undefined,
          }}
        />
      </main>
    </div>
  );
}
