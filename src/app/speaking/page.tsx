import { AppShell } from "@/components/layout/AppShell";
import { SPEAKING_TOPICS } from "@/lib/speaking/topics";
import { READ_ALOUD_PASSAGES } from "@/lib/readaloud/passages";
import { SpeakingTabs } from "@/components/speaking/SpeakingViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Speaking" };

export default async function SpeakingPage() {
  const t = getServerT(await getEffectiveLocale());
  const topics = SPEAKING_TOPICS.map((topic) => ({
    slug: topic.slug, level: topic.level, title: topic.title, prompt: topic.prompt,
    questions: topic.questions, minWords: topic.minWords, targetSecs: topic.targetSecs,
    usefulPhrases: topic.usefulPhrases,
  }));
  const passages = READ_ALOUD_PASSAGES.map((p) => ({
    slug: p.slug, level: p.level, title: p.title, text: p.text, focus: p.focus,
  }));
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.speakingTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("modules.speakingSub")}</p>
      <div className="mt-4"><SpeakingTabs topics={topics} passages={passages} /></div>
    </AppShell>
  );
}
