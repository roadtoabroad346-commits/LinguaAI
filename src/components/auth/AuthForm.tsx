"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";
import { signInSchema, signUpSchema } from "@/lib/auth/schemas";
import { useTranslation } from "@/lib/i18n/I18nProvider";

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setErrors({});
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
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
          },
        });
        if (error) {
          setFormError(error.message);
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
        router.push("/onboarding");
        router.refresh();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setFormError(error.message);
          return;
        }
        await syncLanguageOnLogin();
        router.push("/onboarding");
        router.refresh();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("auth.errors.generic"));
    } finally {
      setLoading(false);
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
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        // Провайдер выключен в Supabase Dashboard -> Auth -> Providers -> Google
        if (msg.includes("provider is not enabled") || msg.includes("unsupported provider")) {
          setFormError(t("auth.errors.oauthFailed"));
        } else {
          setFormError(error.message);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("auth.errors.googleFailed"));
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
      <Alert tone="success" title={t("auth.checkInbox")}>
        {t("auth.checkInboxDesc", { email })}
      </Alert>
    );
  }

  return (
    <div>
      <Button
        variant="secondary"
        className="w-full"
        onClick={handleGoogle}
        loading={oauthLoading}
        disabled={loading}
      >
        {t("auth.continueGoogle")}
      </Button>
      <div className="my-4 flex items-center gap-3 text-xs text-ink-400" aria-hidden>
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
          />
        )}
        <Input
          label={t("auth.email")}
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <Input
          label={t("auth.password")}
          type="password"
          placeholder={mode === "signup" ? t("auth.passwordSignupPlaceholder") : t("auth.passwordLoginPlaceholder")}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint={mode === "signup" ? t("auth.passwordHint") : undefined}
        />
        {formError && (
          <Alert tone="danger" title={mode === "signup" ? t("auth.signupFailed") : t("auth.signinFailed")}>
            {formError}
          </Alert>
        )}
        <Button type="submit" className="w-full" loading={loading} disabled={oauthLoading}>
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
  if (/password/i.test(raw)) return t("auth.errors.passwordRequired");
  return raw;
}
