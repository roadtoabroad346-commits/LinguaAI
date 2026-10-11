"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { PasswordInput } from "./PasswordInput";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { friendlyAuthError } from "@/lib/auth/errors";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/**
 * Step 2 of recovery: user arrived via the email link (session established by
 * /auth/callback), chooses a new password. Handles expired/used links.
 */
export function ResetPasswordForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [done, setDone] = useState(false);

  // The recovery link must yield a session; without it the token is
  // expired/used — show the "request a new link" state, not a dead form.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled) setHasSession(Boolean(data.session?.user));
      } catch {
        if (!cancelled) setHasSession(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) {
          if (k === "confirm" && /do not match/i.test(v[0])) flat[k] = t("auth.passwordMismatch");
          else if (/at least 8/i.test(v[0])) flat[k] = t("auth.errors.passwordMin");
          else if (/repeat/i.test(v[0])) flat[k] = t("auth.confirmRequired");
          else flat[k] = v[0];
        }
      }
      setErrors(flat);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
      if (error) {
        setFormError(friendlyAuthError(error.message, t));
        return;
      }
      setDone(true);
      // Fresh password -> force re-login for a clean session (mobile-safe).
      try {
        await supabase.auth.signOut();
      } catch {
        /* noop */
      }
      await fetch("/auth/signout", { method: "POST", cache: "no-store" }).catch(() => {});
      router.refresh();
    } catch (err) {
      setFormError(friendlyAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label={t("common.loading")}>
        {[0, 1].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-ink-100 dark:bg-ink-800" />
        ))}
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-3">
        <Alert tone="success" title={t("auth.resetDoneTitle")}>
          {t("auth.resetDoneDesc")}
        </Alert>
        <Link href="/login?message=password_updated">
          <Button className="touch-44 min-h-[48px] w-full">{t("auth.resetGoLogin")}</Button>
        </Link>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="space-y-3">
        <Alert tone="danger" title={t("auth.resetBadLinkTitle")}>
          {t("auth.resetBadLinkDesc")}
        </Alert>
        <Link href="/forgot-password">
          <Button className="touch-44 min-h-[48px] w-full">{t("auth.resetRequestNew")}</Button>
        </Link>
        <p className="text-center text-sm text-ink-500">
          <Link
            href="/login"
            className="touch-44 inline-flex min-h-[44px] items-center font-semibold text-brand-700 hover:underline"
          >
            {t("auth.forgotBack")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <PasswordInput
        label={t("auth.newPassword")}
        placeholder={t("auth.passwordResetPlaceholder")}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint={t("auth.passwordHint")}
        disabled={loading}
      />
      <PasswordInput
        label={t("auth.confirmPassword")}
        placeholder={t("auth.passwordResetPlaceholder")}
        autoComplete="new-password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
        disabled={loading}
      />
      {formError && (
        <Alert tone="danger" title={t("auth.errors.updateFailed")}>
          {formError}
        </Alert>
      )}
      <Button type="submit" className="touch-44 min-h-[48px] w-full" loading={loading}>
        {t("auth.resetCta")}
      </Button>
    </form>
  );
}
