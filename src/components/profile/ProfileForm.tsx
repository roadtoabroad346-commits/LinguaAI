"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/feedback";
import { LanguageOptions } from "@/components/i18n/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";
import { GOAL_OPTIONS, profileUpdateSchema } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";

interface Props {
  profile: {
    display_name: string | null;
    native_language: string | null;
    goals: string[];
    daily_goal_xp: number;
    learning_mode: "guided" | "free" | null;
    preferred_language: string | null;
    timezone: string | null;
  };
}

const COMMON_TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
];

function detectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

export function ProfileForm({ profile }: Props) {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [goals, setGoals] = useState<string[]>(profile.goals ?? []);
  const [dailyGoalXp, setDailyGoalXp] = useState(profile.daily_goal_xp);
  const [learningMode, setLearningMode] = useState<"guided" | "free">(profile.learning_mode ?? "guided");
  const [interfaceLanguage, setInterfaceLanguage] = useState<Locale>(
    isLocale(profile.preferred_language) ? profile.preferred_language : locale
  );
  const [timezone, setTimezone] = useState(profile.timezone ?? detectedTimezone());
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 6)));
  }

  function pickLanguage(next: Locale) {
    setInterfaceLanguage(next);
    // Settings → Language applies immediately, persists on Save.
    setLocale(next);
  }

  async function save() {
    setError(null);
    setSuccess(false);
    setFieldError(null);
    const parsed = profileUpdateSchema.safeParse({
      displayName: displayName.trim() || undefined,
      goals,
      dailyGoalXp,
      learningMode,
      preferredLanguage: interfaceLanguage,
      timezone,
    });
    if (!parsed.success) {
      setFieldError(t("common.checkFields"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((json as { error?: string }).error ?? t("common.couldNotSaveProfile"));
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-sm font-medium text-ink-700">{t("language.interfaceLanguage")}</legend>
        <div className="mt-2">
          <LanguageOptions value={interfaceLanguage} onChange={pickLanguage} />
        </div>
      </fieldset>
      <Input
        label={t("profile.displayName")}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        maxLength={60}
      />
      <fieldset>
        <legend className="text-sm font-medium text-ink-700">{t("profile.goals")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => toggleGoal(g)}
              aria-pressed={goals.includes(g)}
              className={cn(
                "min-w-0 rounded-full border px-3 py-1.5 text-sm font-medium",
                goals.includes(g)
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </fieldset>
      <Input
        label={t("profile.dailyGoalXp")}
        type="number"
        min={10}
        max={200}
        step={5}
        value={dailyGoalXp}
        onChange={(e) => setDailyGoalXp(Number(e.target.value))}
      />
      <fieldset>
        <legend className="text-sm font-medium text-ink-700">{t("profile.learningPath")}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={t("profile.learningPath")}>
          {(["guided", "free"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={learningMode === m}
              onClick={() => setLearningMode(m)}
              className={cn(
                "min-w-0 rounded-xl border px-3 py-2.5 text-left text-sm",
                learningMode === m
                  ? "border-brand-600 bg-brand-50"
                  : "border-ink-200 bg-white hover:border-ink-300"
              )}
            >
              <span className="font-semibold">{m === "guided" ? t("common.guidedPath") : t("common.freeLearning")}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="profile-timezone" className="text-sm font-medium text-ink-700">{t("profile.timezone")}</label>
        <select
          id="profile-timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          {Array.from(new Set([timezone, ...COMMON_TIMEZONES])).map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>
      {fieldError && (
        <Alert tone="warning" title={t("common.checkInput")}>
          {fieldError}
        </Alert>
      )}
      {error && (
        <Alert tone="danger" title={t("common.saveFailed")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert tone="success" title={t("common.saved")}>
          {t("common.profileUpdated")}
        </Alert>
      )}
      <Button onClick={save} loading={saving}>
        {t("common.saveChanges")}
      </Button>
    </div>
  );
}
