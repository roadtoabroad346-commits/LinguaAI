import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "@/components/auth/UserMenu";
import { BottomTabBar } from "./MobileNav";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { PageTransition } from "@/lib/motion/components";
import { getRequestLocale, getServerT } from "@/lib/i18n/server";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const locale = getRequestLocale();
  const t = getServerT(locale);
  return (
    <div className="bg-mesh min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        {t("common.skipToContent")}
      </a>
      <Header
        title={title}
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <UserMenu />
          </>
        }
      />
      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-5 md:grid-cols-[248px_minmax(0,1fr)] md:px-6 md:py-8">
        <aside className="hidden md:block">
          <div className="glass sticky top-24 max-h-[calc(100dvh-7.5rem)] overflow-y-auto rounded-3xl border border-ink-200/70 p-3 shadow-card dark:border-ink-800">
            <Sidebar />
          </div>
        </aside>
        <main id="main" className="min-w-0 pb-28 md:pb-10">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
      <BottomTabBar />
    </div>
  );
}
