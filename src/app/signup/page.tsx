import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/learn/AuthShell";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { resolveNextPath } from "@/lib/auth/routing";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) {
    const profile = await getSessionProfile().catch(() => null);
    redirect(resolveNextPath(profile, "/dashboard"));
  }

  const t = getServerT(await getEffectiveLocale());

  return (
    <div className="min-h-dvh">
      <Header
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/login" className="touch-44 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-700 hover:underline">
              {t("auth.loginCta")}
            </Link>
          </>
        }
      />
      <AuthShell title={t("auth.signupTitle")} desc={t("auth.signupDesc")}>
        <Suspense>
          <AuthForm mode="signup" />
        </Suspense>
        <p className="mt-4 text-center text-sm text-ink-500">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {t("auth.loginCta")}
          </Link>
        </p>
      </AuthShell>
    </div>
  );
}
