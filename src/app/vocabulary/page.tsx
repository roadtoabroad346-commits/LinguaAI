import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { VOCAB_BANK, countByLevel } from "@/lib/vocab/bank";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { VocabularyExplorer } from "@/components/vocab/VocabularyExplorer";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "Vocabulary" };

export default async function VocabularyPage() {
  const t = getServerT(await getEffectiveLocale());
  const user = await getSessionUser();
  const profile = user ? await getSessionProfile() : null;

  let savedEntries: Array<{ word: string; mastery: number }> = [];
  if (user) {
    try {
      const supabase = createClient();
      const { data } = await supabase.from("dictionary_entries").select("word,mastery").eq("user_id", user.id).limit(500);
      savedEntries = ((data ?? []) as Array<{ word: string; mastery: number }>);
    } catch {
      savedEntries = [];
    }
  }

  const counts = countByLevel();

  return (
    <AppShell>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.vocabularyTitle")}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {t("modules.vocabularySub", { count: VOCAB_BANK.length })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href="/vocabulary/practice"><Button size="sm">{t("modules.practiceQuiz")}</Button></Link>
          <Link href="/flashcards"><Button size="sm" variant="secondary">{t("modules.flashcardsTitle")}</Button></Link>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2" role="list" aria-label={t("modules.vocabularyTitle")}>
        {(Object.keys(counts) as Array<keyof typeof counts>).map((lvl) => (
          <Card key={lvl} className="min-w-0 p-3 text-center">
            <p className="text-sm font-bold">{lvl}</p>
            <p className="truncate text-xs text-ink-500">{t("modules.wordsCount", { count: counts[lvl] })}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <VocabularyExplorer
          initialWords={VOCAB_BANK}
          savedEntries={savedEntries}
          signedIn={Boolean(user)}
          defaultLevel={profile?.level ?? null}
        />
      </div>

      <Card className="mt-4">
        <CardTitle>{t("modules.howConnects")}</CardTitle>
        <CardDescription>
          {t("modules.howConnectsDesc")}
        </CardDescription>
      </Card>
    </AppShell>
  );
}
