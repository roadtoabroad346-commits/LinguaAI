"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface SignOutButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "warm";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

/**
 * The ONLY sign-out control. Never link to /auth/signout with <Link>:
 * Next.js prefetches in-viewport links in production, and a GET to the
 * signout route clears the session — merely rendering the page logged the
 * user out (the "Edit profile kicks to login" bug). This button signs out
 * explicitly: client session first, then server httpOnly cookies via POST.
 */
export function SignOutButton({ variant = "ghost", size = "sm", className }: SignOutButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      try {
        await createClient().auth.signOut();
      } catch {
        /* fall through to server signout */
      }
      await fetch("/auth/signout", { method: "POST", cache: "no-store" }).catch(() => {});
    } finally {
      setBusy(false);
      router.push("/login?signed_out=1");
      router.refresh();
    }
  }

  return (
    <Button variant={variant} size={size} className={className} onClick={handleClick} loading={busy}>
      {t("auth.signout")}
    </Button>
  );
}
