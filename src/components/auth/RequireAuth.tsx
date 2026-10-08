"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * Shared signed-in gate. Renders a skeleton while auth is loading and the
 * sign-in card only when status is anonymous — identical everywhere.
 */
export function RequireAuth({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const { status } = useAuth();
  const { t } = useTranslation();

  if (status === "loading") {
    return (
      <Card aria-busy="true">
        <CardTitle>{title ?? t("common.loadingAccount")}</CardTitle>
        <div className="mt-4 space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100 dark:bg-ink-800" />
          ))}
        </div>
      </Card>
    );
  }

  if (status === "anonymous") {
    return (
      <Card>
        <CardTitle>{title ?? t("smart.unlock")}</CardTitle>
        <CardDescription>{description ?? t("smart.unlockDesc")}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/login">
            <Button size="sm">{t("auth.loginCta")}</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" variant="secondary">
              {t("auth.signupCta")}
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
