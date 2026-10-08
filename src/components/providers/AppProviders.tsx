"use client";

import * as React from "react";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider, type AuthSnapshot } from "@/components/auth/AuthProvider";

export function AppProviders({
  children,
  initialAuth,
}: {
  children: React.ReactNode;
  initialAuth?: AuthSnapshot & { status: "authenticated" | "anonymous" };
}) {
  const initial = initialAuth ?? {
    status: "anonymous" as const,
    userId: null,
    email: null,
    onboardingCompleted: false,
    placementCompleted: false,
    level: null,
  };
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider initial={initial}>{children}</AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
