"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { IconButton } from "@/components/ui/IconButton";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, setTheme, theme } = useTheme();
  return (
    <IconButton
      label={resolved === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={className}
      onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
      active={theme !== "system" ? undefined : undefined}
    >
      {resolved === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </IconButton>
  );
}
