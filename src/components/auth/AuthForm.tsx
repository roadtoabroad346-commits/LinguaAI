"use client";

import { readJson } from "@/lib/api/response";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";
import { PasswordInput } from "./PasswordInput";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { friendlyAuthError } from "@/lib/auth/errors";
import { resolveNextPath, sanitizeNext } from "@/lib/auth/routing";
import { readGuestData } from "@/lib/auth/storage";
import { migrateGuestPlacement } from "@/lib/placement/guest";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = sanitizeNext(searchParams?.get("next"), "/dashboard");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  /** After any successful password auth: migrate guest data, then route by DB state. */
  async function postAuthRedirect(): Promise<string> {
    await migrateGuestOnce().catch(() => {});
    // Guest placement replay first: a test taken before signup must count.
    await migrateGuestPlacement().catch(() => {});
    await syncLanguageOnLogin().catch(() => {});
    try {
      const res = await fetch("/api/me/bootstrap", { cache: "no-store" });
      if (res.ok) {
        const json = await readJson(res).catch(() => null);
        const profile = (json?.profile ?? null) as {
          onboarding_completed?: boolean;
          placement_completed?: boolean;
          level?: string | null;
        } | null;
        return resolveNextPath(profile, requestedNext);
      }
    } catch {
      /* fall through to requested next */
    }
    return requestedNext;
  }

  /** One-time guest -> account merge; server wins, never overwrites placement. */
  async function migrateGuestOnce() {
    try {
      const guest = readGuestData(window.localStorage);
      if (guest.savedWords.length === 0) return;
      await fetch("/api/me/migrate-guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: guest.savedWords }),
      }).catch(() => {});
      // Clear guest keys so the next user on this browser never sees them.
      try {
        window.localStorage.removeItem("linguaai:saved-words");
        window.localStorage.removeItem("linguaai_flash_fav");
      } catch {
        /* noop */
      }
    } catch {
      /* best-effort */
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
    setEmailNotConfirmed(false);
    const schema = mode === "signup" ? signUpSchema : signInSchema;
    const parsed = schema.safeParse(
      mode === "signup" ? { displayName, email, password } : { email, password }
    );
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v && v[0]) flat[k] = localizeZodError(v[0], t);
      }
      setErrors(flat);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName || undefined },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(requestedNext)}`,
          },
        });
        if (error) {
          setFormError(friendlyAuthError(error.message, t));
          return;
        }
        // Ensure a profile row (in case the DB trigger is not installed yet).
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user) {
          await supabase.from("profiles").upsert({
            id: userData.user.id,
            email: userData.user.email,
            display_name: displayName || null,
          } as never);
        }
        // If email confirmation is on, there is no session yet: ask to check inbox.
        if (!userData.user) {
          setCheckInbox(true);
          return;
        }
        const dest = await postAuthRedirect();
        router.push(dest);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const friendly = friendlyAuthError(error.message, t);
          setFormError(friendly);
          if (/not confirmed/i.test(error.message)) setEmailNotConfirmed(true);
          return;
        }
        const dest = await postAuthRedirect();
        router.push(dest);
        router.refresh();
      }
    } catch (err) {
      setFormError(friendlyAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    if (!email || resending) return;
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(requestedNext)}` },
      });
      if (error) {
        setFormError(friendlyAuthError(error.message, t));
        return;
      }
      setResent(true);
    } catch (err) {
      setFormError(friendlyAuthError(err, t));
    } finally {
      setResending(false);
    }
  }

  /** Push the local language preference into the profile after password login. */
  async function syncLanguageOnLogin() {
    try {
      const preferred = window.localStorage.getItem("linguaai_locale");
      if (preferred !== "kk" && preferred !== "ru" && preferred !== "en") return;
      await fetch("/api/profile/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: preferred }),
      }).catch(() => {});
    } catch {
      /* non-blocking */
    }
  }

  async function handleGoogle() {
    setFormError(null);
    setOauthLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(requestedNext)}`,
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        // Провайдер выключен в Supabase Dashboard -> Auth -> Providers -> Google
        if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
          setFormError(t("auth.errors.oauthFailed"));
        } else {
          setFormError(friendlyAuthError(error.message, t));
        }
      }
    } catch (err) {
      setFormError(friendlyAuthError(err, t));
    } finally {
      setOauthLoading(false);
    }
  }

  if (!configured) {
    return (
      <Alert tone="warning" title={t("common.backendMissing")}>
        Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
        enable authentication. See <code>.env.example</code>.
      </Alert>
    );
  }

  if (checkInbox) {
    return (
      <div className="space-y-3">
        <Alert tone="success" title={t("auth.checkInbox")}>
          {t("auth.checkInboxDesc", { email })}
        </Alert>
        {resent && (
          <Alert tone="success" title={t("auth.resentConfirmation")} >
            {t("auth.resentConfirmation")}
          </Alert>
        )}
        <Button
          variant="secondary"
          className="touch-44 min-h-[44px] w-full"
          onClick={handleResendConfirmation}
          loading={resending}
        >
          {t("auth.resendConfirmation")}
        </Button>
        <p className="text-center text-sm text-ink-500">
          <Link href="/login" className="touch-44 inline-flex min-h-[44px] items-center font-semibold text-brand-700 hover:underline">
            {t("auth.forgotBack")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <Button
        variant="secondary"
        className="touch-44 min-h-[48px] w-full"
        onClick={handleGoogle}
        loading={oauthLoading}
        disabled={loading}
      >
        {t("auth.continueGoogle")}
      </Button>
      <div className="my-4 flex items-center gap-3 text-xs text-ink-500 dark:text-ink-300" aria-hidden>
        <span className="h-px flex-1 bg-ink-200" />
        <span>{t("common.orWithEmail")}</span>
        <span className="h-px flex-1 bg-ink-200" />
      </div>
      <form onSubmit={handleSubmit} noValidate className="space-y-3">
        {mode === "signup" && (
          <Input
            label={t("auth.name")}
            placeholder={t("auth.namePlaceholder")}
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            error={errors.displayName}
            disabled={loading || oauthLoading}
          />
        )}
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
          error={errors.email}
          disabled={loading || oauthLoading}
        />
        <PasswordInput
          label={t("auth.password")}
          placeholder={mode === "signup" ? t("auth.passwordSignupPlaceholder") : t("auth.passwordLoginPlaceholder")}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={mode === "signup" ? t("auth.passwordHint") : undefined}
          disabled={loading || oauthLoading}
        />
        {mode === "signin" && (
          <div className="flex justify-end">
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
              className="touch-44 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-700 hover:underline"
            >
              {t("auth.forgotPassword")}
            </Link>
          </div>
        )}
        {formError && (
          <Alert tone="danger" title={mode === "signup" ? t("auth.signupFailed") : t("auth.signinFailed")}>
            {formError}
          </Alert>
        )}
        {emailNotConfirmed && email && (
          <Button
            type="button"
            variant="secondary"
            className="touch-44 min-h-[44px] w-full"
            onClick={handleResendConfirmation}
            loading={resending}
          >
            {t("auth.resendConfirmation")}
          </Button>
        )}
        {resent && (
          <Alert tone="success" title={t("auth.resentConfirmation")}>
            {t("auth.resentConfirmation")}
          </Alert>
        )}
        <Button
          type="submit"
          className="touch-44 min-h-[48px] w-full"
          loading={loading}
          disabled={oauthLoading}
        >
          {mode === "signup" ? t("auth.signupCta") : t("auth.loginCta")}
        </Button>
      </form>
    </div>
  );
}

/** Map English zod messages to localized validation strings. */
function localizeZodError(raw: string, t: (key: string) => string): string {
  if (/valid email/i.test(raw)) return t("auth.errors.invalidEmail");
  if (/at least 8 characters/i.test(raw)) return t("auth.errors.passwordMin");
  if (/do not match/i.test(raw)) return t("auth.passwordMismatch");
  if (/repeat/i.test(raw)) return t("auth.confirmRequired");
  if (/password/i.test(raw)) return t("auth.errors.passwordRequired");
  return raw;
}
