import { AppShell } from "@/components/layout/AppShell";
import { ExerciseRunner } from "@/components/exercises/ExerciseRunner";
import { listValidatedExercises } from "@/lib/exercises/catalog";
import { toPublicExercise } from "@/lib/exercises/engine";
import { getSessionProfile } from "@/lib/auth/session";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Practice Lab" };

export default async function PracticePage() {
  const [profile, locale] = await Promise.all([getSessionProfile(), getEffectiveLocale()]);
  const t = getServerT(locale);
  const exercises = listValidatedExercises().map(toPublicExercise);
  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">{t("practice.title")}</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-500">{t("practice.subtitle")}</p>
      <div className="mt-4">
        <ExerciseRunner exercises={exercises} initialLevel={profile?.level ?? "A1"} />
      </div>
    </AppShell>
  );
}
