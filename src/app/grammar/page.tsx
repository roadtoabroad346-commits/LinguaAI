import { AppShell } from "@/components/layout/AppShell";
import { GRAMMAR_TOPICS } from "@/lib/grammar/topics";
import { GrammarList } from "@/components/grammar/GrammarViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Grammar" };

export default async function GrammarPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.grammarTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.grammarSub")}
      </p>
      <div className="mt-4">
        <GrammarList topics={GRAMMAR_TOPICS} />
      </div>
    </AppShell>
  );
}
