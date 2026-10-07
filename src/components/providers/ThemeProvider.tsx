"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";

const Ctx = React.createContext<{
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}>({ theme: "system", resolved: "light", setTheme: () => {} });

export function useTheme() {
  return React.useContext(Ctx);
}

function resolveSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolved, setResolved] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("linguaai_theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") setThemeState(stored);
    } catch {
      /* noop */
    }
  }, []);

  React.useEffect(() => {
    const apply = () => {
      const r = theme === "system" ? resolveSystem() : theme;
      setResolved(r);
      document.documentElement.classList.toggle("dark", r === "dark");
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", r === "dark" ? "#020617" : "#4f46e5");
    };
    apply();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => theme === "system" && apply();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  // Apply manual reduced-motion flag as an attribute for CSS hooks.
  React.useEffect(() => {
    try {
      const rm = localStorage.getItem("linguaai_reduced_motion") === "1";
      document.documentElement.dataset.reducedMotion = rm ? "1" : "0";
    } catch {
      /* noop */
    }
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem("linguaai_theme", t);
    } catch {
      /* noop */
    }
  }, []);

  return <Ctx.Provider value={{ theme, resolved, setTheme }}>{children}</Ctx.Provider>;
}
