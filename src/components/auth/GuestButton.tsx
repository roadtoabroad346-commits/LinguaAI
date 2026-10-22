"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { readJson } from "@/lib/api/response";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * One-click guest access for demos, jury reviews and investors.
 * Calls POST /api/auth/guest which provisions a real session, then routes by
 * DB state exactly like password auth (onboarding → placement → dashboard).
 */
export function GuestButton({
  variant = "secondary",
  withDivider = true,
}: {
  variant?: "secondary" | "ghost";
  /** Show the "or continue with email" separator above the button. */
  withDivider?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuest() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = (await readJson(res)) as {
        ok?: boolean;
        next?: string;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? t("auth.guestFailed"));
        return;
      }
      const next = typeof json.next === "string" && json.next.startsWith("/") ? json.next : "/dashboard";
      // Full reload-free navigation + refresh server data under the new session.
      router.push(next);
      router.refresh();
    } catch {
      setError(t("auth.guestFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {withDivider && (
        <div className="flex items-center gap-3 text-xs text-ink-500 dark:text-ink-300" aria-hidden>
          <span className="h-px flex-1 bg-ink-200" />
          <span>{t("common.orWithEmail")}</span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>
      )}
      <Button
        type="button"
        variant={variant}
        className="touch-44 min-h-[48px] w-full"
        onClick={handleGuest}
        loading={loading}
      >
        {t("auth.guestCta")}
      </Button>
      <p className="text-center text-xs text-ink-500">{t("auth.guestCtaDesc")}</p>
      {error && (
        <Alert tone="danger" title={t("auth.guestFailed")}>
          {error}
        </Alert>
      )}
      {error && (
        <p className="text-center text-sm text-ink-500">
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {t("auth.forgotBack")}
          </Link>
        </p>
      )}
    </div>
  );
}
