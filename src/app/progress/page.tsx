import { AppShell } from "@/components/layout/AppShell";
import { ProgressViews } from "@/components/progress/ProgressViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Progress" };

// NOTE: no server-side redirect here on purpose. Middleware already guards
// direct URL access, and a page-level guard can disagree with it on a single
// stale-cookie request (false kick to /login for a signed-in user).
// ProgressViews gates on the live client session instead — an in-app click
// can never bounce a logged-in user to the login wall.
export default async function ProgressPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.progressTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.progressSub")}
      </p>
      <div className="mt-6">
        <ProgressViews />
      </div>
    </AppShell>
  );
}
