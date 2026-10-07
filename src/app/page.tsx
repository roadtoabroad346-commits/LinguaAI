import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/feedback";
import { Header } from "@/components/layout/Header";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { APP_NAME } from "@/lib/constants";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export default async function LandingPage() {
  const locale = await getEffectiveLocale();
  const t = getServerT(locale);
  const MODULES = [
    { title: t("landing.modules.guidedTitle"), desc: t("landing.modules.guidedDesc") },
    { title: t("landing.modules.vocabTitle"), desc: t("landing.modules.vocabDesc") },
    { title: t("landing.modules.teacherTitle"), desc: t("landing.modules.teacherDesc") },
    { title: t("landing.modules.smartTitle"), desc: t("landing.modules.smartDesc") }
  ];
  return (
    <div className="min-h-screen">
      <Header
        right={
          <>
            <LanguageSwitcher />
            <Link href="/login"><Button variant="ghost" size="sm">{t("landing.login")}</Button></Link>
            <Link href="/signup"><Button size="sm">{t("landing.signup")}</Button></Link>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-4 py-12">
        <section className="grid items-center gap-8 md:grid-cols-2">
          <div className="min-w-0">
            <Badge tone="brand">{t("landing.badge")}</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-900 md:text-5xl">
              {t("landing.title").replace("LinguaAI", APP_NAME)}
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-500">
              {t("landing.subtitle")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/signup"><Button size="lg">{t("landing.getStarted")}</Button></Link>
              <Link href="/placement"><Button size="lg" variant="secondary">{t("landing.tryPlacement")}</Button></Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {MODULES.map((m) => (
              <Card key={m.title}>
                <CardTitle>{m.title}</CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
