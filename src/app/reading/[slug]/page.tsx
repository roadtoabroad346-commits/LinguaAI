import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/feedback";
import { getReadingPassage, toPublicReadingQuestions, readingWordCount } from "@/lib/reading/library";
import { ReadingRunner } from "@/components/reading/ReadingViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = getReadingPassage(params.slug);
  return { title: p ? `Reading: ${p.title}` : "Reading" };
}

export default async function ReadingPassagePage({ params }: { params: { slug: string } }) {
  const p = getReadingPassage(params.slug);
  if (!p) notFound();
  const t = getServerT(await getEffectiveLocale());

  return (
    <AppShell>
      <nav aria-label={t("learn.breadcrumb")} className="truncate text-xs text-ink-500">
        <Link href="/reading" className="underline">{t("modules.readingTitle")}</Link> / <span>{p.title}</span>
      </nav>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight">{p.title}</h1>
        <Badge tone="brand">{p.level}</Badge>
        <Badge>{t("modules.wordsCount", { count: readingWordCount(p) })}</Badge>
        <Badge>{t("learn.minLabel", { count: p.minutes })}</Badge>
      </div>
      <div className="mt-4">
        <ReadingRunner
          slug={p.slug}
          paragraphs={p.paragraphs}
          vocabFocus={p.vocabFocus}
          questions={toPublicReadingQuestions(p)}
        />
      </div>
    </AppShell>
  );
}
