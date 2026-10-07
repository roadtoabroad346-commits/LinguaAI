import { AppShell } from "@/components/layout/AppShell";
import { TeacherChat } from "@/components/teacher/TeacherViews";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "AI Teacher" };

export default async function AiTeacherPage() {
  const t = getServerT(await getEffectiveLocale());
  return (
    <AppShell>
      <h1 className="truncate text-2xl font-bold tracking-tight">{t("teacher.title")}</h1>
      <p className="mt-1 text-sm text-ink-500">{t("teacher.desc")}</p>
      <div className="mt-4"><TeacherChat /></div>
    </AppShell>
  );
}
