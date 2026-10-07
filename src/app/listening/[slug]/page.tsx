import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/feedback";
import { getListeningTrack, toPublicListeningQuestions } from "@/lib/listening/library";
import { ListeningRunner } from "@/components/listening/ListeningViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const t = getListeningTrack(params.slug);
  return { title: t ? `Listening: ${t.title}` : "Listening" };
}

export default async function ListeningTrackPage({ params }: { params: { slug: string } }) {
  const t = getListeningTrack(params.slug);
  if (!t) notFound();
  const tr = getServerT(await getEffectiveLocale());

  return (
    <AppShell>
      <nav aria-label={tr("learn.breadcrumb")} className="truncate text-xs text-ink-500">
        <Link href="/listening" className="underline">{tr("modules.listeningTitle")}</Link> / <span>{t.title}</span>
      </nav>
      <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 text-2xl font-bold tracking-tight">{t.title}</h1>
        <Badge tone="brand">{t.level}</Badge>
        <Badge>{t.kind}</Badge>
        <Badge>{tr("learn.minLabel", { count: t.minutes })}</Badge>
      </div>
      <p className="mt-1 text-sm text-ink-500">{t.summary}</p>
      <div className="mt-4">
        <ListeningRunner
          slug={t.slug}
          lines={t.lines}
          vocabFocus={t.vocabFocus}
          questions={toPublicListeningQuestions(t)}
          dictationIndexes={t.dictationIndexes}
        />
      </div>
    </AppShell>
  );
}
