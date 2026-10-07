import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHero } from "@/components/learn/PageHero";
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
      <PageHero
        title={t("modules.vocabularyTitle")}
        desc={t("modules.vocabularySub", { count: VOCAB_BANK.length })}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/vocabulary/practice"><Button size="sm" shine>{t("modules.practiceQuiz")}</Button></Link>
            <Link href="/flashcards"><Button size="sm" variant="secondary">{t("modules.flashcardsTitle")}</Button></Link>
          </div>
        }
      />

      <div className="mt-4 grid grid-cols-5 gap-2" role="list" aria-label={t("modules.vocabularyTitle")}>
        {(Object.keys(counts) as Array<keyof typeof counts>).map((lvl, i) => (
          <div
            key={lvl}
            role="listitem"
            className={
              i === 0
                ? "rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-center text-white shadow-card"
                : i === 4
                  ? "rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 p-3 text-center text-white shadow-card"
                  : "rounded-2xl border border-ink-200/70 bg-white p-3 text-center shadow-card dark:border-ink-700 dark:bg-ink-900"
            }
          >
            <p className="text-sm font-extrabold">{lvl}</p>
            <p className={`truncate text-xs tabular-nums ${i === 0 || i === 4 ? "text-white/85" : "text-ink-500"}`}>{t("modules.wordsCount", { count: counts[lvl] })}</p>
          </div>
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
