import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription } from "@/components/ui/Card";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { getWord, relatedWords } from "@/lib/vocab/bank";
import { masteryBand, BAND_LABEL } from "@/lib/vocab/mastery";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SaveWordButton } from "@/components/vocab/SaveWordButton";
import { TranslationPanel } from "@/components/vocab/TranslationPanel";
import { WordAudioClient } from "@/components/vocab/WordAudioClient";
import { WordCard } from "@/components/vocab/WordCard";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { word: string } }) {
  const entry = getWord(params.word);
  return { title: entry ? `${entry.word} — Vocabulary` : "Vocabulary" };
}

export default async function WordDetailPage({ params }: { params: { word: string } }) {
  const entry = getWord(params.word);
  if (!entry) notFound();
  const t = getServerT(await getEffectiveLocale());

  const user = await getSessionUser();
  const profile = user ? await getSessionProfile() : null;

  let saved = false;
  let mastery = 0;
  let translation: string | null = null;
  if (user) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("dictionary_entries")
        .select("mastery,translation")
        .eq("user_id", user.id)
        .eq("word", entry.slug)
        .maybeSingle();
      if (data) {
        saved = true;
        mastery = (data as { mastery: number }).mastery ?? 0;
        translation = (data as { translation: string | null }).translation ?? null;
      }
    } catch {
      // Preview fallback: shown as unsaved.
    }
  }

  const related = relatedWords(entry);
  const band = masteryBand(mastery);
  const bandLabel =
    band === "new" ? t("learn.bandNew")
    : band === "learning" ? t("learn.bandLearning")
    : band === "familiar" ? t("learn.bandFamiliar")
    : band === "mastered" ? t("learn.bandMastered")
    : BAND_LABEL[band] ?? band;

  return (
    <AppShell>
      <nav aria-label={t("learn.breadcrumb")} className="truncate text-xs text-ink-500">
        <Link href="/vocabulary" className="underline">{t("modules.vocabularyTitle")}</Link>
        <span aria-hidden> / </span>
        <span aria-current="page">{entry.word}</span>
      </nav>

      <Card className="mt-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{entry.word}</h1>
              <Badge tone="brand">{entry.level}</Badge>
              <Badge>{entry.partOfSpeech}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-500">{entry.phonetic}</p>
          </div>
          <div className="flex items-center gap-2">
            <WordAudioClient word={entry.word} />
            <SaveWordButton word={entry.slug} initialSaved={saved} signedIn={Boolean(user)} size="md" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink-900">{t("learn.definition")}</h2>
            <p className="mt-1 text-base text-ink-800">{entry.definition}</p>
            <h2 className="mt-4 text-sm font-semibold text-ink-900">{t("learn.example")}</h2>
            <p className="mt-1 text-sm italic text-ink-600">“{entry.example}”</p>
          </div>
          <div className="min-w-0">
            {saved ? (
              <div className="rounded-2xl border border-ink-200/70 p-4">
                <h2 className="text-sm font-semibold text-ink-900">{t("learn.yourMastery")}</h2>
                <p className="mt-1 text-sm text-ink-600">{bandLabel} · {mastery}%</p>
                <Progress value={mastery} label={t("learn.masteryLabel", { pct: mastery })} className="mt-2" />
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/flashcards"><Button size="sm" variant="secondary">{t("smart.reviewInFlashcards")}</Button></Link>
                  <Link href="/vocabulary/practice"><Button size="sm" variant="ghost">{t("modules.practiceQuiz")}</Button></Link>
                </div>
              </div>
            ) : (
              <Alert tone="brand" title={user ? t("learn.notSavedYet") : t("common.previewMode")}>
                {user ? t("learn.saveToTrack") : t("learn.signinToSave")}
              </Alert>
            )}
            <div className="mt-4">
              <TranslationPanel word={entry.slug} initialTranslation={translation} signedIn={Boolean(user)} nativeLang={profile?.native_language ?? null} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-4">
        <CardDescription>
          {t("learn.savedFlow")}
        </CardDescription>
      </Card>

      <div className="mt-6">
        <h2 className="text-base font-semibold">{t("learn.moreWords", { level: entry.level })}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {related.map((w) => (
            <WordCard key={w.slug} word={w} saved={false} mastery={null} signedIn={Boolean(user)} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
