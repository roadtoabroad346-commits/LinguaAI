import { AppShell } from "@/components/layout/AppShell";
import { SmartPathViews } from "@/components/smart-path/SmartPathViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Smart Path" };

export default async function SmartPathPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("nav.smartPath")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.smartPathSub")}
      </p>
      <div className="mt-6">
        <SmartPathViews />
      </div>
    </AppShell>
  );
}
