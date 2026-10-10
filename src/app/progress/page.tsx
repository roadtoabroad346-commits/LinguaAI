import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressViews } from "@/components/progress/ProgressViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/progress");
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
