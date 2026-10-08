import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { PlacementRunner } from "@/components/placement/PlacementRunner";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { CardDescription } from "@/components/ui/Card";
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
    redirect("/dashboard");
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
