import { AppShell } from "@/components/layout/AppShell";
import { SpellingViews } from "@/components/spelling/SpellingViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Spelling" };

export default async function SpellingPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.spellingTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.spellingSub")}
      </p>
      <div className="mt-6">
        <SpellingViews />
      </div>
    </AppShell>
  );
}
