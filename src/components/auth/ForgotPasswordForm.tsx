"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { friendlyAuthError } from "@/lib/auth/errors";
import { useTranslation } from "@/lib/i18n/I18nProvider";

/** Step 1 of recovery: enter email -> Supabase sends a reset link. */
export function ForgotPasswordForm({ initialEmail = "" }: { initialEmail?: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function send(to: string) {
    setLoading(true);
    setFormError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(to, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      });
      if (error) {
        setFormError(friendlyAuthError(error.message, t));
        return false;
      }
      return true;
    } catch (err) {
      setFormError(friendlyAuthError(err, t));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setFormError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(t("auth.errors.invalidEmail"));
      return;
    }
    if (await send(parsed.data.email)) setSent(true);
  }

  if (!configured) {
    return (
      <Alert tone="warning" title={t("common.backendMissing")}>
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
        enable authentication. See <code>.env.example</code>.
      </Alert>
    );
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <Alert tone="success" title={t("auth.forgotSentTitle")}>
          {t("auth.forgotSentDesc", { email })}
        </Alert>
        <Button
          variant="secondary"
          className="touch-44 min-h-[44px] w-full"
          onClick={() => send(email).catch(() => {})}
          loading={loading}
        >
          {t("auth.forgotResend")}
        </Button>
        {formError && (
          <Alert tone="danger" title={t("auth.errors.sendFailed")}>
            {formError}
          </Alert>
        )}
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
      <Input
        label={t("auth.email")}
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldError ?? undefined}
        disabled={loading}
      />
      {formError && (
        <Alert tone="danger" title={t("auth.errors.sendFailed")}>
          {formError}
        </Alert>
      )}
      <Button type="submit" className="touch-44 min-h-[48px] w-full" loading={loading}>
        {t("auth.forgotCta")}
      </Button>
      <p className="text-center text-sm text-ink-500">
        <Link
          href="/login"
          className="touch-44 inline-flex min-h-[44px] items-center font-semibold text-brand-700 hover:underline"
        >
          {t("auth.forgotBack")}
        </Link>
      </p>
    </form>
  );
}
