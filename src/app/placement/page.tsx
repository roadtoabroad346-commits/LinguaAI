import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { PlacementRunner } from "@/components/placement/PlacementRunner";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Placement test" };

export const dynamic = "force-dynamic";

/**
 * Placement test is open to everyone (explicit guest preview without an account).
 * Signed-in users get their result saved to their profile.
 * Completed users are redirected home unless they explicitly retake.
 * Questions themselves stay in English — they assess English level.
 */
export default async function PlacementPage({
  searchParams,
}: {
  searchParams?: { retake?: string };
}) {
  const user = await getSessionUser();
  const profile = user ? await getSessionProfile() : null;
  const t = getServerT(await getEffectiveLocale());

  const placementDone =
    (profile as { placement_completed?: boolean } | null)?.placement_completed === true ||
    (typeof profile?.level === "string" && (profile.level?.length ?? 0) > 0);
  if (user && profile?.onboarding_completed && placementDone && searchParams?.retake !== "1") {
    // Signed-in + already placed: offer choices instead of a silent bounce to
    // /dashboard (the bounce made "Try a placement test" feel broken, and hid
    // the only path to a new account: sign out first).
    return (
      <div className="min-h-screen">
        <Header right={<LanguageSwitcher />} />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Card className="text-center">
            <CardTitle>{t("placement.yourLevel")}{profile?.level ? `: ${profile.level}` : ""}</CardTitle>
            <CardDescription>{t("placement.retakeHint")}</CardDescription>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/placement?retake=1">
                <Button>{t("placement.retake")}</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">{t("placement.goDashboard")}</Button>
              </Link>
              <Link href="/auth/signout">
                <Button variant="ghost">{t("auth.signout")}</Button>
              </Link>
            </div>
            <p className="mt-3 text-xs text-ink-500 dark:text-ink-400">{t("placement.switchAccountHint")}</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header right={<LanguageSwitcher />} />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="truncate text-2xl font-bold tracking-tight">{t("placement.title")}</h1>
        <CardDescription>{t("placement.desc")}</CardDescription>
        <div className="mt-4">
          <PlacementRunner signedIn={Boolean(user)} existingLevel={profile?.level ?? null} />
        </div>
      </main>
    </div>
  );
}
