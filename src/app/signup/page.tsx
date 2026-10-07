import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { AuthForm } from "@/components/auth/AuthForm";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { getSessionUser } from "@/lib/auth/session";
import { getEffectiveLocale, getServerT } from "@/lib/i18n/server";

export const metadata = { title: "Sign up" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect("/onboarding");

  const t = getServerT(await getEffectiveLocale());

  return (
    <div className="min-h-screen">
      <Header
        right={
          <>
            <LanguageSwitcher />
            <Link href="/login" className="text-sm font-medium text-brand-700 hover:underline">
              {t("auth.loginCta")}
            </Link>
          </>
        }
      />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardTitle>{t("auth.signupTitle")}</CardTitle>
          <CardDescription>{t("auth.signupDesc")}</CardDescription>
          <div className="mt-4">
            <AuthForm mode="signup" />
            <p className="mt-3 text-center text-sm text-ink-500">
              {t("auth.haveAccount")}{" "}
              <Link href="/login" className="font-medium text-brand-700 hover:underline">
                {t("auth.loginCta")}
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
