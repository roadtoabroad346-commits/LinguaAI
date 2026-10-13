import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { PlacementRunner } from "@/components/placement/PlacementRunner";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/feedback";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Placement test" };

export const dynamic = "force-dynamic";

/**
 * Placement test is open to everyone (explicit guest preview without an account).
 * Signed-in users get their result saved to their profile.
 * Completed users see their saved result (no forced retake, no redirect loop);
 * a new attempt starts only via explicit ?retake=1.
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
  const wantsRetake = searchParams?.retake === "1";

  const placementDone =
    (profile as { placement_completed?: boolean } | null)?.placement_completed === true ||
    (typeof profile?.level === "string" && (profile.level?.length ?? 0) > 0);

  // Authoritative saved result for the completed view (single source: placement_results).
  interface LatestAttempt {
    level?: string | null;
    score?: number | null;
    total?: number | null;
    skill_scores?: Record<string, { score?: number; level?: string; answered?: boolean }> | null;
    created_at?: string | null;
    test_version?: string | null;
  }
  let latest: LatestAttempt | null = null;
  let historyCount = 0;
  if (user && placementDone && !wantsRetake) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("placement_results")
        .select("level,score,total,skill_scores,created_at,test_version")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      const rows = ((data ?? []) as unknown as LatestAttempt[]);
      if (rows.length > 0) {
        latest = rows[0] ?? null;
        historyCount = rows.length;
      }
    } catch {
      /* completed view still renders from the profile level */
    }
  }

  if (user && profile?.onboarding_completed && placementDone && !wantsRetake) {
    // Signed-in + already placed: show the SAVED result, never force a retake.
    // Refresh / re-login lands here too — the completed attempt stays completed.
    const skillEntries =
      latest?.skill_scores && typeof latest.skill_scores === "object"
        ? Object.entries(latest.skill_scores).filter(
            ([k, v]) =>
              !k.startsWith("_") && v && typeof v === "object" && (v as { answered?: boolean }).answered !== false
          )
        : [];
    return (
      <div className="min-h-screen">
        <Header right={<LanguageSwitcher />} />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <Card className="text-center">
            <CardTitle>
              {t("placement.yourLevel")}
              {profile?.level ? `: ${profile.level}` : ""}
            </CardTitle>
            <CardDescription>{t("placement.retakeHint")}</CardDescription>
            {latest && (
              <div className="mx-auto mt-3 max-w-md text-sm text-ink-600 dark:text-ink-300">
                <p className="tabular-nums">
                  {typeof latest.score === "number" && typeof latest.total === "number"
                    ? `${latest.score}/${latest.total}`
                    : ""}{" "}
                  {latest.created_at
                    ? `· ${new Date(latest.created_at).toLocaleDateString()}`
                    : ""}{" "}
                  {latest.test_version ? `· ${latest.test_version}` : ""}
                  {historyCount > 1 ? ` · ${historyCount} attempts` : ""}
                </p>
                {skillEntries.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {skillEntries.slice(0, 7).map(([k, v]) => (
                      <Badge key={k} tone="brand">
                        {k}: {(v as { level?: string }).level ?? (v as { score?: number }).score ?? "—"}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/placement?retake=1">
                <Button>{t("placement.retake")}</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary">{t("placement.goDashboard")}</Button>
              </Link>
              <Link href="/smart-path">
                <Button variant="secondary">{t("placement.openSmartPath")}</Button>
              </Link>
              <Link href="/profile">
                <Button variant="ghost">{t("nav.profile")}</Button>
              </Link>
              <SignOutButton variant="ghost" />
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
          <PlacementRunner
            signedIn={Boolean(user)}
            userId={user?.id ?? null}
            existingLevel={profile?.level ?? null}
          />
        </div>
      </main>
    </div>
  );
}
