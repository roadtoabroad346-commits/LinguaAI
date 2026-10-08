"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert, Badge, Progress } from "@/components/ui/feedback";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { StickyActionBar } from "@/components/learn/StickyActionBar";
import { LanguageOptions } from "@/components/i18n/LanguageSwitcher";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import type { Locale } from "@/lib/i18n/config";
import { isLocale } from "@/lib/i18n/config";
import {
  GOAL_OPTIONS,
  NATIVE_LANGUAGES,
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";

const STEP_KEYS = [
  "onboarding.steps.language",
  "onboarding.steps.about",
  "onboarding.steps.goals",
  "onboarding.steps.path",
] as const;

export function OnboardingWizard({ initial }: { initial: Omit<Partial<OnboardingInput>, "preferredLanguage"> & { preferredLanguage?: string; onboardingStep?: number } }) {
  const { t, locale, setLocale } = useTranslation();
  const router = useRouter();
  const clampStep = (s: number) => Math.min(Math.max(0, s || 0), STEP_KEYS.length - 1);
  const [step, setStep] = useState(() => clampStep(initial.onboardingStep ?? 0));
  const [interfaceLanguage, setInterfaceLanguage] = useState<Locale>(
    isLocale(initial.preferredLanguage) ? initial.preferredLanguage : locale
  );
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [nativeLanguage, setNativeLanguage] = useState(initial.nativeLanguage ?? "");
  const [goals, setGoals] = useState<string[]>(initial.goals ?? []);
  const [dailyGoalXp, setDailyGoalXp] = useState<number>(initial.dailyGoalXp ?? 30);
  const [learningMode, setLearningMode] = useState<"guided" | "free">(
    initial.learningMode ?? "guided"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [direction, setDirection] = useState(1);

  /** Best-effort per-step progress save so closing the tab never loses answers. */
  function saveProgress(nextStep: number) {
    try {
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          nativeLanguage: nativeLanguage || undefined,
          goals: goals.length > 0 ? goals : undefined,
          dailyGoalXp: Number.isFinite(dailyGoalXp) ? dailyGoalXp : undefined,
          learningMode,
          preferredLanguage: interfaceLanguage,
          onboardingStep: nextStep,
        }),
      }).catch(() => {});
    } catch {
      /* non-blocking */
    }
  }

  function toggleGoal(g: string) {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].slice(0, 6)));
  }

  function pickLanguage(next: Locale) {
    setInterfaceLanguage(next);
    // Apply immediately — no waiting for submit, no reload.
    setLocale(next);
  }

  function validateStep(s: number): boolean {
    if (s === 1) {
      const errs: Record<string, string> = {};
      if (!displayName.trim()) errs.displayName = t("onboarding.nameRequired");
      if (!nativeLanguage) errs.nativeLanguage = t("onboarding.nativeRequired");
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }
    if (s === 2) {
      const errs: Record<string, string> = {};
      if (goals.length === 0) errs.goals = t("onboarding.goalsRequired");
      if (!Number.isFinite(dailyGoalXp) || dailyGoalXp < 10 || dailyGoalXp > 200)
        errs.dailyGoalXp = t("onboarding.dailyGoalRange");
      setErrors(errs);
      return Object.keys(errs).length === 0;
    }
    return true;
  }

  function next() {
    setSubmitError(null);
    if (validateStep(step)) {
      setErrors({});
      setDirection(1);
      const nextStep = Math.min(step + 1, STEP_KEYS.length - 1);
      setStep(nextStep);
      saveProgress(nextStep);
    }
  }

  async function finish() {
    setSubmitError(null);
    const parsed = onboardingSchema.safeParse({
      displayName,
      nativeLanguage,
      goals,
      dailyGoalXp,
      learningMode,
      preferredLanguage: interfaceLanguage,
      onboardingStep: STEP_KEYS.length - 1,
    });
    if (!parsed.success) {
      const flat: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v && v[0]) flat[k] = v[0];
      }
      setErrors(flat);
      // Jump to the step containing the first error.
      if (flat.displayName || flat.nativeLanguage) setStep(1);
      else if (flat.goals || flat.dailyGoalXp) setStep(2);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError((json as { error?: string }).error ?? t("common.couldNotSave"));
        return;
      }
      // Persist the cookie server-side too (profile is now the source of truth).
      await fetch("/api/profile/language", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLanguage: interfaceLanguage }),
      }).catch(() => {});
      router.push("/placement");
      router.refresh();
    } catch {
      setSubmitError(t("common.networkError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <CardTitle className="min-w-0 flex-1 truncate">{step === 0 ? t("language.chooseLanguage") : t("onboarding.title")}</CardTitle>
        <Badge tone="brand" className="shrink-0">
          {t("onboarding.stepOf", { current: step + 1, total: STEP_KEYS.length })}
        </Badge>
      </div>
      <CardDescription>{t(STEP_KEYS[step])}</CardDescription>
      <Progress value={((step + 1) / STEP_KEYS.length) * 100} className="mt-3" />

      <div className="mt-5 min-h-[240px]">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: 44 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -44 * direction }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-ink-500">{t("language.chooseLanguageDesc")}</p>
            <LanguageOptions value={interfaceLanguage} onChange={pickLanguage} />
            <p className="text-xs text-ink-500">{t("onboarding.levelDesc")}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <Input
              label={t("onboarding.yourName")}
              placeholder={t("onboarding.namePlaceholder")}
              autoComplete="name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={errors.displayName}
            />
            <div>
              <label htmlFor="native" className="mb-1.5 block text-sm font-medium text-ink-700">
                {t("onboarding.nativeLanguage")}
              </label>
              <select
                id="native"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="h-10 w-full rounded-xl border border-ink-200 bg-white px-3 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-invalid={Boolean(errors.nativeLanguage) || undefined}
              >
                <option value="">{t("onboarding.selectOption")}</option>
                {NATIVE_LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              {errors.nativeLanguage && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.nativeLanguage}
                </p>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <fieldset>
              <legend className="text-sm font-medium text-ink-700">{t("onboarding.learningGoals")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {GOAL_OPTIONS.map((g) => {
                  const active = goals.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGoal(g)}
                      aria-pressed={active}
                      className={cn(
                        "touch-44 min-h-[44px] min-w-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all focus-visible:outline-2",
                        active
                          ? "border-brand-600 bg-brand-600 text-white shadow-pop"
                          : "border-ink-200 bg-white text-ink-700 hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
                      )}
                    >
                      {g}
                    </button>
                  );
                })}
              </div>
              {errors.goals && (
                <p role="alert" className="mt-1 text-xs text-red-600">
                  {errors.goals}
                </p>
              )}
            </fieldset>
            <Input
              label={t("onboarding.dailyGoal")}
              type="number"
              min={10}
              max={200}
              step={5}
              value={dailyGoalXp}
              onChange={(e) => setDailyGoalXp(Number(e.target.value))}
              error={errors.dailyGoalXp}
              hint={t("onboarding.dailyGoalHint")}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3" role="radiogroup" aria-label={t("onboarding.pathLabel")}>
            <ModeCard
              active={learningMode === "guided"}
              onSelect={() => setLearningMode("guided")}
              title={t("onboarding.guidedTitle")}
              description={t("onboarding.guidedDesc")}
            />
            <ModeCard
              active={learningMode === "free"}
              onSelect={() => setLearningMode("free")}
              title={t("onboarding.freeTitle")}
              description={t("onboarding.freeDesc")}
            />
            <p className="text-xs text-ink-500">{t("onboarding.pathHint")}</p>
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {submitError && (
        <div className="mt-4">
          <Alert tone="danger" title={t("common.saveFailed")}>
            {submitError}
          </Alert>
        </div>
      )}

      <StickyActionBar className="mt-6">
        <Button variant="ghost" onClick={() => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); }} disabled={step === 0 || saving} className="flex-1">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </Button>
        {step < STEP_KEYS.length - 1 ? (
          <Button onClick={next} className="flex-[2]" shine>{t("common.continue")} <ArrowRight className="h-4 w-4" /></Button>
        ) : (
          <Button onClick={finish} loading={saving} className="flex-[2]" shine>
            {t("onboarding.saveStart")}
          </Button>
        )}
      </StickyActionBar>
    </Card>
  );
}

function ModeCard({
  active,
  onSelect,
  title,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "touch-44 w-full rounded-3xl border p-5 text-left transition-all focus-visible:outline-2",
        active
          ? "border-brand-600 bg-brand-50 shadow-[0_0_0_3px_rgb(99_102_241/0.16)] dark:bg-brand-950"
          : "border-ink-200 bg-white hover:border-brand-300 dark:border-ink-700 dark:bg-ink-900"
      )}
    >
      <p className="font-bold text-ink-900 dark:text-ink-50">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">{description}</p>
    </button>
  );
}
