import { AppShell } from "@/components/layout/AppShell";
import { READING_PASSAGES, readingWordCount } from "@/lib/reading/library";
import { ReadingList } from "@/components/reading/ReadingViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Reading" };

export default async function ReadingPage() {
  const t = getServerT(await getEffectiveLocale());
  const words: Record<string, number> = {};
  for (const p of READING_PASSAGES) words[p.slug] = readingWordCount(p);
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.readingTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.readingSub")}
      </p>
      <div className="mt-4">
        <ReadingList passages={READING_PASSAGES} words={words} />
      </div>
    </AppShell>
  );
}
