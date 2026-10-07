import * as React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string;
}
export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">{label}</label>}
      <input id={inputId} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy}
        className={cn("h-10 w-full rounded-xl border bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100", error ? "border-red-400" : "border-ink-200", "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400", className)} {...props} />
      {error ? <p id={`${inputId}-error`} role="alert" className="mt-1 text-xs text-red-600">{error}</p>
        : hint ? <p id={`${inputId}-hint`} className="mt-1 text-xs text-ink-500">{hint}</p> : null}
    </div>
  );
}
