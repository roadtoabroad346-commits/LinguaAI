import { AppShell } from "@/components/layout/AppShell";
import { FlashcardRunner } from "@/components/vocab/FlashcardRunner";
import { StudioDashboard } from "@/components/vocab-studio/StudioDashboard";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Flashcards Pro — Vocabulary Studio" };

export default async function FlashcardsPage(props: { searchParams?: Promise<{ view?: string }> }) {
  const searchParams = await props.searchParams;
  const t = getServerT(await getEffectiveLocale());
  const classic = searchParams?.view === "classic";
  return (
    <AppShell>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {classic ? t("modules.flashcardsTitle") : "Flashcards Pro"}
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            {classic
              ? t("modules.flashcardsSub")
              : "Personal vocabulary studio — sets, spaced repetition, 5 study modes, imports and real analytics."}
          </p>
        </div>
      </div>
      <div className="mt-4">{classic ? <FlashcardRunner /> : <StudioDashboard />}</div>
    </AppShell>
  );
}
