import { cn } from "@/lib/utils";

/**
 * Accessible toggle switch.
 *
 * The 44px touch target (WCAG) is separated from the 32px visual track:
 * never put a min-height touch class directly on the track — it stretches
 * the track while the knob stays positioned for 32px. Knob motion uses
 * transform (GPU) instead of `left` (layout).
 */
export function Switch({ on, onFlip, label }: { on: boolean; onFlip: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onFlip}
      className="flex min-h-[44px] w-14 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2 focus-visible:outline-brand-600"
    >
      <span
        aria-hidden
        className={cn(
          "relative h-8 w-14 rounded-full transition-colors",
          on ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700"
        )}
      >
        <span
          className={cn(
            "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform",
            on ? "translate-x-6" : "translate-x-0"
          )}
        />
      </span>
    </button>
  );
}
