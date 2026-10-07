import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-12 w-full rounded-2xl border bg-white px-4 text-base text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:bg-ink-900 dark:text-ink-50 dark:focus:ring-brand-950 md:h-11 md:text-sm",
          error ? "border-red-400" : "border-ink-200 dark:border-ink-700",
          "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400",
          className
        )}
        {...props}
      />
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

export function Textarea({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string; hint?: string }) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-ink-700 dark:text-ink-200">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "min-h-[120px] w-full rounded-2xl border border-ink-200 bg-white p-4 text-base leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50 md:text-sm",
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
