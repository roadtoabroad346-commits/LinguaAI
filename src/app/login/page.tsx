import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { AuthForm } from "@/components/auth/AuthForm";
import { Alert } from "@/components/ui/feedback";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getSessionUser } from "@/lib/auth/session";
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
  searchParams: { error?: string; signed_out?: string };
}) {
  const user = await getSessionUser();
  if (user) redirect("/onboarding");

  const t = getServerT(await getEffectiveLocale());

  return (
    <div className="min-h-screen">
      <Header
        right={
          <>
            <LanguageSwitcher />
            <Link href="/signup" className="text-sm font-medium text-brand-700 hover:underline">
              {t("auth.createAccount")}
            </Link>
          </>
        }
      />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardTitle>{t("auth.loginTitle")}</CardTitle>
          <CardDescription>{t("auth.loginDesc")}</CardDescription>
          <div className="mt-4 space-y-3">
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
            <AuthForm mode="signin" />
            <p className="text-center text-sm text-ink-500">
              {t("auth.newTo")}{" "}
              <Link href="/signup" className="font-medium text-brand-700 hover:underline">
                {t("auth.createAccount")}
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
