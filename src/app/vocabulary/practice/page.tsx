import { AppShell } from "@/components/layout/AppShell";
import { PracticeRunner } from "@/components/vocab/PracticeRunner";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Vocabulary practice" };

export default async function VocabularyPracticePage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("learn.vocabPractice")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("learn.practicePageDesc")}
      </p>
      <div className="mt-4">
        <PracticeRunner />
      </div>
    </AppShell>
  );
}
