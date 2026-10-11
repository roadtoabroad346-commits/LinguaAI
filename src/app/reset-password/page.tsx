import Link from "next/link";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/learn/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Choose a new password" };

// NOTE: deliberately public (no server redirect): the recovery session is
// established client-side by /auth/callback exchanging the email `code`.
// ResetPasswordForm gates on the live browser session and shows the
// "request a new link" state for expired/used tokens.
export default async function ResetPasswordPage() {
  const t = getServerT(await getEffectiveLocale());

  return (
    <div className="min-h-dvh">
      <Header
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link
              href="/login"
              className="touch-44 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("auth.loginCta")}
            </Link>
          </>
        }
      />
      <AuthShell title={t("auth.resetTitle")} desc={t("auth.resetDesc")}>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </AuthShell>
    </div>
  );
}
