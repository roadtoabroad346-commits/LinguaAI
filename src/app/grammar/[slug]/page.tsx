import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/feedback";
import { getGrammarTopic, toPublicGrammarQuestions } from "@/lib/grammar/topics";
import { GrammarRunner } from "@/components/grammar/GrammarViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const t = getGrammarTopic(params.slug);
  return { title: t ? `Grammar: ${t.title}` : "Grammar" };
}

export default async function GrammarTopicPage({ params }: { params: { slug: string } }) {
  const topic = getGrammarTopic(params.slug);
  if (!topic) notFound();
  const t = getServerT(await getEffectiveLocale());

  return (
    <AppShell>
      <nav aria-label={t("learn.breadcrumb")} className="truncate text-xs text-ink-500">
        <Link href="/grammar" className="underline">{t("modules.grammarTitle")}</Link> / <span>{topic.title}</span>
      </nav>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight">{topic.title}</h1>
        <Badge tone="brand">{topic.level}</Badge>
        <Badge>{t("learn.questionsCount", { count: topic.questions.length })}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-500">{topic.summary}</p>

      <Card className="mt-4">
        <CardTitle>{t("learn.lesson")}</CardTitle>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-700">
          {topic.explanation.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <ul className="mt-3 space-y-1.5">
          {topic.examples.map((e, i) => (
            <li key={i} className="rounded-xl bg-ink-50 px-3 py-2 text-sm">
              <span className="font-medium">“{e.sentence}”</span>
              <span className="text-ink-500"> — {e.note}</span>
            </li>
          ))}
        </ul>
      </Card>

      <h2 className="mt-6 text-lg font-semibold">{t("learn.practise")}</h2>
      <p className="mb-3 text-sm text-ink-500">{t("learn.practiseDesc")}</p>
      <GrammarRunner slug={topic.slug} questions={toPublicGrammarQuestions(topic)} />
    </AppShell>
  );
}
