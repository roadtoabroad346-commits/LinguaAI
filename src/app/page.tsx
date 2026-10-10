import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Header } from "@/components/layout/Header";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { APP_NAME } from "@/lib/constants";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";
import { getSessionUser } from "@/lib/auth/session";
import { LandingStory } from "@/components/landing/LandingStory";

export const metadata = {
  title: "Learn English A1–C1 with AI",
  description: "Placement in 6 minutes, Smart Path every day, vocabulary → reading → listening loop, XP and streaks. Thumb-first mobile app.",
};

export default async function LandingPage() {
  const locale = await getEffectiveLocale();
  const t = getServerT(locale);
  // Signed-in visitors get dashboard + sign-out (the path to a new account),
  // not login/signup buttons that would just bounce them back to /dashboard.
  const user = await getSessionUser().catch(() => null);
  return (
    <div className="min-h-dvh">
      <Header
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button size="sm">{t("nav.dashboard")}</Button>
                </Link>
                <Link
                  href="/auth/signout"
                  className="touch-44 inline-flex min-h-[44px] items-center text-sm font-semibold text-ink-500 hover:underline dark:text-ink-400"
                >
                  {t("auth.signout")}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("landing.login")}
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">{t("landing.signup")}</Button>
                </Link>
              </>
            )}
          </>
        }
      />
      <main>
        <LandingStory />
      </main>
      <footer className="border-t border-ink-200/60 py-8 dark:border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-ink-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {APP_NAME} · {t("landing.footTag")}
          </p>
          <div className="flex gap-4">
            <Link href="/placement" className="hover:underline">
              {t("landing.footPlacement")}
            </Link>
            <Link href="/dashboard" className="hover:underline">
              {t("landing.footDashboard")}
            </Link>
            <Link href="/health" className="hover:underline">
              {t("landing.footStatus")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
