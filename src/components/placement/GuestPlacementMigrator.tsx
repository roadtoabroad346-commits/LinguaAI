"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { migrateGuestPlacement } from "@/lib/placement/guest";

/**
 * Covers the OAuth path (full page load after /auth/callback): replays a
 * guest placement result into the fresh account, then refreshes so server
 * guards see the level. Silent on failure; password logins are handled in
 * AuthForm.postAuthRedirect before routing.
 */
export function GuestPlacementMigrator() {
  const router = useRouter();
  useEffect(() => {
    migrateGuestPlacement()
      .then((r) => {
        if (r === "migrated") router.refresh();
      })
      .catch(() => {});
  }, [router]);
  return null;
}
