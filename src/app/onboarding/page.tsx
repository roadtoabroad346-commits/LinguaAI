import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { AuthShell } from "@/components/learn/AuthShell";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/feedback";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const t = getServerT(await getEffectiveLocale());

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-dvh">
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
    <div className="min-h-dvh">
      <Header
        title={t("onboarding.title")}
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
          </>
        }
      />
      <AuthShell wide title={t("onboarding.title")} desc={t("onboarding.subtitle")}>
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
      </AuthShell>
    </div>
  );
}
