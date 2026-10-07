import { cn } from "@/lib/utils";

const GRADIENTS = [
  "from-brand-500 to-violet-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-sky-500 to-brand-600",
];

export function Avatar({
  name,
  size = "md",
  className,
}: {
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  const initials = (name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gi = (name?.length ?? 1) % GRADIENTS.length;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white",
        GRADIENTS[gi],
        dims,
        className
      )}
    >
      {initials}
    </span>
  );
}
