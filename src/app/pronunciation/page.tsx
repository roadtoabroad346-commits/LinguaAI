import { AppShell } from "@/components/layout/AppShell";
import { PRONUNCIATION_DRILLS } from "@/lib/pronunciation/drills";
import { PronunciationList } from "@/components/pronunciation/PronunciationViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Pronunciation" };

export default async function PronunciationPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.pronunciationTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.pronunciationSub")}
      </p>
      <div className="mt-4">
        <PronunciationList drills={PRONUNCIATION_DRILLS} />
      </div>
    </AppShell>
  );
}
