import { AppShell } from "@/components/layout/AppShell";
import { WRITING_TASKS } from "@/lib/writing/tasks";
import { WritingExplorer } from "@/components/writing/WritingViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Writing" };

export default async function WritingPage() {
  const t = getServerT(await getEffectiveLocale());
  const tasks = WRITING_TASKS.map((t) => ({ slug: t.slug, level: t.level, title: t.title, kind: t.kind, prompt: t.prompt, minWords: t.minWords, maxWords: t.maxWords }));
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.writingTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("modules.writingSub")}</p>
      <div className="mt-4"><WritingExplorer initialTasks={tasks} /></div>
    </AppShell>
  );
}
