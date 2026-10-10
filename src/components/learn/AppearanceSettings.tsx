"use client";

import * as React from "react";
import { Moon, Sun, Vibrate, PersonStanding } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function Row({
  icon,
  title,
  desc,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200/70 p-3 dark:border-ink-700">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-ink-500 dark:text-ink-400">{desc}</p>
      </div>
      {control}
    </div>
  );
}

/** Appearance + motion + haptics settings. Persisted in localStorage; no API change. */
export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [reduced, setReduced] = React.useState(false);
  const [haptics, setHaptics] = React.useState(true);

  React.useEffect(() => {
    try {
      setReduced(localStorage.getItem("linguaai_reduced_motion") === "1");
      setHaptics(localStorage.getItem("linguaai_haptics") !== "0");
    } catch {
      /* noop */
    }
  }, []);

  const toggleReduced = () => {
    const next = !reduced;
    setReduced(next);
    try {
      localStorage.setItem("linguaai_reduced_motion", next ? "1" : "0");
    } catch {
      /* noop */
    }
  };
  const toggleHaptics = () => {
    const next = !haptics;
    setHaptics(next);
    try {
      localStorage.setItem("linguaai_haptics", next ? "1" : "0");
    } catch {
      /* noop */
    }
  };

  const seg = (value: string, label: string, active: boolean, onClick: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "touch-44 flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors",
        active ? "bg-brand-600 text-white shadow-pop" : "text-ink-500 hover:text-ink-900 dark:text-ink-400 dark:hover:text-ink-100"
      )}
    >
      {label}
    </button>
  );

  return (
    <Card>
      <CardTitle>Appearance & motion</CardTitle>
      <CardDescription>Theme follows your system by default. Reduce motion anytime.</CardDescription>
      <div className="mt-3 space-y-2.5">
        <Row
          icon={theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          title="Theme"
          desc="System, light or dark"
          control={
            <div className="flex w-44 gap-1 rounded-2xl bg-ink-100 p-1 dark:bg-ink-800" role="group" aria-label="Theme">
              {seg("system", "Auto", theme === "system", () => setTheme("system"))}
              {seg("light", "Light", theme === "light", () => setTheme("light"))}
              {seg("dark", "Dark", theme === "dark", () => setTheme("dark"))}
            </div>
          }
        />
        <Row
          icon={<PersonStanding className="h-5 w-5" />}
          title="Reduce motion"
          desc="Fades instead of slides"
          control={
            <button
              role="switch"
              aria-checked={reduced}
              onClick={toggleReduced}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full transition-colors",
                reduced ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all",
                  reduced ? "left-7" : "left-1"
                )}
              />
            </button>
          }
        />
        <Row
          icon={<Vibrate className="h-5 w-5" />}
          title="Haptics"
          desc="Gentle vibration on taps"
          control={
            <button
              role="switch"
              aria-checked={haptics}
              onClick={toggleHaptics}
              className={cn(
                "relative h-8 w-14 shrink-0 rounded-full transition-colors",
                haptics ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700"
              )}
            >
              <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all", haptics ? "left-7" : "left-1")} />
            </button>
          }
        />
      </div>
    </Card>
  );
}
