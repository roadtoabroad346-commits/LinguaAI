import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { APP_NAME } from "@/lib/constants";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { LandingStory } from "@/components/landing/LandingStory";

export const metadata = {
  title: "Learn English A1–C1 with AI",
  description: "Placement in 6 minutes, Smart Path every day, vocabulary → reading → listening loop, XP and streaks. Thumb-first mobile app.",
};

export default async function LandingPage() {
  const locale = await getEffectiveLocale();
  const t = getServerT(locale);
  const copy = {
    badge: t("landing.badge"),
    subtitle: t("landing.subtitle"),
    getStarted: t("landing.getStarted"),
    tryPlacement: t("landing.tryPlacement"),
    login: t("landing.login"),
    signup: t("landing.signup"),
  };
  return (
    <div className="min-h-dvh">
      <Header
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {copy.login}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{copy.signup}</Button>
            </Link>
          </>
        }
      />
      <main>
        <LandingStory t={copy} />
      </main>
      <footer className="border-t border-ink-200/60 py-8 dark:border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-ink-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {APP_NAME} · A1–C1 English with AI
          </p>
          <div className="flex gap-4">
            <Link href="/placement" className="hover:underline">
              Placement
            </Link>
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <Link href="/health" className="hover:underline">
              Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
