import { AppShell } from "@/components/layout/AppShell";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DictionaryView, type DictionaryEntry } from "@/components/vocab/DictionaryView";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export const metadata = { title: "My dictionary" };

export default async function DictionaryPage() {
  const t = getServerT(await getEffectiveLocale());
  const user = await getSessionUser();
  let entries: DictionaryEntry[] = [];
  if (user) {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("dictionary_entries")
        .select("word,mastery,definition,part_of_speech,level,phonetic,example,translation,next_review_at,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      entries = ((data ?? []) as DictionaryEntry[]);
    } catch {
      entries = [];
    }
  }

  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.dictionaryTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("modules.dictionarySub")}</p>
      <div className="mt-4">
        <DictionaryView initialEntries={entries} signedIn={Boolean(user)} />
      </div>
    </AppShell>
  );
}
