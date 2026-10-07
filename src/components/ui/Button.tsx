import * as React from "react";
import { cn } from "@/lib/utils";
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-ink-200 disabled:text-ink-400 shadow-pop",
  secondary: "bg-white text-ink-800 border border-ink-200 hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-300",
  ghost: "text-ink-600 hover:bg-ink-100 disabled:text-ink-300",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-ink-200"
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-12 px-6 text-base" };
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant; size?: Size; loading?: boolean;
}
export function Button({ variant = "primary", size = "md", loading = false, disabled, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-2 disabled:cursor-not-allowed", variants[variant], sizes[size], className)}
      disabled={disabled || loading} aria-busy={loading || undefined} {...props}
    >
      {loading && <Spinner size="sm" aria-hidden />}
      {children}
    </button>
  );
}
export function Spinner({ size = "md", className, ...props }: { size?: Size } & React.HTMLAttributes<HTMLSpanElement>) {
  const dims = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-8 w-8" : "h-5 w-5";
  return <span role="status" className={cn("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", dims, className)} {...props} />;
}
