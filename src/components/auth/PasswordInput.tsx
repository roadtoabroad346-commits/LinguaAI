"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * Mobile-first password field: 48px target, eye toggle with 44px hit area,
 * autocomplete-aware. Single component so login / signup / reset match.
 */
export function PasswordInput({ label, error, hint, id, ...props }: PasswordInputProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = React.useState(false);
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">
          {label}
        </label>
      )}
      <div className="relative">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          label={undefined}
          error={undefined}
          hint={undefined}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          aria-invalid={error ? true : undefined}
          className="pr-12"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          title={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          className="touch-44 absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-600 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-ink-200"
        >
          {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-500 dark:text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
