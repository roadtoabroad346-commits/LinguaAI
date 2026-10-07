import { AppShell } from "@/components/layout/AppShell";
import { FlashcardRunner } from "@/components/vocab/FlashcardRunner";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Flashcards" };

export default async function FlashcardsPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.flashcardsTitle")}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t("modules.flashcardsSub")}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <FlashcardRunner />
      </div>
    </AppShell>
  );
}
