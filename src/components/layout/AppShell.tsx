import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { UserMenu } from "@/components/auth/UserMenu";
import { MobileNav } from "./MobileNav";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getRequestLocale, getServerT } from "@/lib/i18n/server";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = getServerT(getRequestLocale());
  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium">
        {t("common.skipToContent")}
      </a>
      <Header
        right={
          <>
            <LanguageSwitcher />
            <UserMenu />
          </>
        }
      />
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden md:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-ink-200/70 bg-white p-3 shadow-card">
            <Sidebar />
          </div>
        </aside>
        <main id="main" className="min-w-0">{children}</main>
      </div>
      <MobileNav />
      <div className="h-16 md:hidden" aria-hidden />
    </div>
  );
}
