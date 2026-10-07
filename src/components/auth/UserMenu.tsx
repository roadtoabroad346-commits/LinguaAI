"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Header auth cluster: shows Profile + Sign out when signed in, Log in otherwise. */
export function UserMenu() {
  const { t } = useTranslation();
  const [state, setState] = useState<"loading" | "out" | "in">("loading");
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;
        setState(data.user ? "in" : "out");
        setEmail(data.user?.email ?? null);
      } catch {
        if (mounted) setState("out");
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="h-8 w-24 animate-pulse rounded-lg bg-ink-100" aria-label={t("common.loadingAccount")} role="status" />
    );
  }

  if (state === "out") {
    return (
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
    );
  }

  return (
    <>
      <Link
        href="/profile"
        className="hidden max-w-40 truncate text-xs text-ink-500 sm:block"
        title={email ?? t("auth.profile")}
      >
        {email ?? t("auth.profile")}
      </Link>
      <Link href="/profile">
        <Button variant="ghost" size="sm">
          {t("auth.profile")}
        </Button>
      </Link>
      <Link href="/auth/signout">
        <Button variant="secondary" size="sm">
          {t("auth.signout")}
        </Button>
      </Link>
    </>
  );
}
