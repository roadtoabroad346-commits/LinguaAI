import { AppShell } from "@/components/layout/AppShell";
import { LISTENING_TRACKS } from "@/lib/listening/library";
import { ListeningList } from "@/components/listening/ListeningViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Listening" };

export default async function ListeningPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("modules.listeningTitle")}</h1>
      <p className="mt-1 text-sm text-ink-500">
        {t("modules.listeningSub")}
      </p>
      <div className="mt-4">
        <ListeningList tracks={LISTENING_TRACKS} />
      </div>
    </AppShell>
  );
}
