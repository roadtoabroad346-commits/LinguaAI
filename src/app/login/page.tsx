import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/learn/AuthShell";
import { Alert } from "@/components/ui/feedback";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { ThemeToggle } from "@/components/providers/ThemeToggle";
import { getSessionProfile, getSessionUser } from "@/lib/auth/session";
import { resolveNextPath, sanitizeNext } from "@/lib/auth/routing";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Log in" };

const ERROR_KEYS: Record<string, string> = {
  oauth_failed: "auth.errors.oauthFailed",
  missing_code: "auth.errors.missingCode",
  not_configured: "auth.errors.notConfigured",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; signed_out?: string; next?: string };
}) {
  const user = await getSessionUser();
  if (user) {
    const profile = await getSessionProfile().catch(() => null);
    redirect(resolveNextPath(profile, sanitizeNext(searchParams.next, "/dashboard")));
  }

  const t = getServerT(await getEffectiveLocale());

  return (
    <div className="min-h-dvh">
      <Header
        right={
          <>
            <ThemeToggle />
            <LanguageSwitcher />
            <Link href="/signup" className="touch-44 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-700 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </>
        }
      />
      <AuthShell title={t("auth.loginTitle")} desc={t("auth.loginDesc")}>
        <div className="space-y-3">
          {searchParams.error && (
            <Alert tone="danger" title={t("auth.signinProblem")}>
              {t(ERROR_KEYS[searchParams.error] ?? "auth.errors.generic")}
            </Alert>
          )}
          {searchParams.signed_out && (
            <Alert tone="success" title={t("auth.signedOut")}>
              {t("auth.signedOutDesc")}
            </Alert>
          )}
          <Suspense>
            <AuthForm mode="signin" />
          </Suspense>
          <p className="text-center text-sm text-ink-500">
            {t("auth.newTo")}{" "}
            <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </p>
        </div>
      </AuthShell>
    </div>
  );
}
