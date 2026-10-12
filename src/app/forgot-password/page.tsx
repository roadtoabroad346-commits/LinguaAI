import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AuthShell } from "@/components/learn/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { getSessionUserResilient } from "@/lib/auth/session";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { email?: string };
}) {
  // Signed-in users don't need recovery.
  const user = await getSessionUserResilient();
  if (user) redirect("/dashboard");

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
      <AuthShell title={t("auth.forgotTitle")} desc={t("auth.forgotDesc")}>
        <Suspense>
          <ForgotPasswordForm initialEmail={searchParams?.email ?? ""} />
        </Suspense>
      </AuthShell>
    </div>
  );
}
