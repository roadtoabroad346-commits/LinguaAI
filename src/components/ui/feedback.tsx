import { cn } from "@/lib/utils";
const tones: Record<string, string> = {
  default: "bg-ink-100 text-ink-700", brand: "bg-brand-100 text-brand-800",
  success: "bg-green-100 text-green-800", warning: "bg-amber-100 text-amber-800", danger: "bg-red-100 text-red-700"
};
export function Badge({ tone = "default", className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)} {...props} />;
}
export function Progress({ value, max = 100, className, label }: { value: number; max?: number; className?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      {label && <div className="mb-1 flex justify-between text-xs text-ink-500"><span>{label}</span><span>{Math.round(pct)}%</span></div>}
      <div role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
export function Alert({ tone = "default", title, children }: { tone?: "default" | "success" | "warning" | "danger" | "brand"; title?: string; children: React.ReactNode }) {
  const map: Record<string, string> = {
    default: "border-ink-200 bg-ink-50 text-ink-700", brand: "border-brand-200 bg-brand-50 text-brand-900",
    success: "border-green-200 bg-green-50 text-green-900", warning: "border-amber-200 bg-amber-50 text-amber-900", danger: "border-red-200 bg-red-50 text-red-900"
  };
  return <div role="alert" className={`rounded-xl border p-3 text-sm ${map[tone]}`}>{title && <p className="font-semibold">{title}</p>}<div>{children}</div></div>;
}
export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
