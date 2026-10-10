"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearUserScopedKeys } from "@/lib/auth/storage";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthSnapshot {
  userId: string | null;
  email: string | null;
  onboardingCompleted: boolean;
  placementCompleted: boolean;
  level: string | null;
}

interface AuthContextValue {
  status: AuthStatus;
  userId: string | null;
  email: string | null;
  onboardingCompleted: boolean;
  placementCompleted: boolean;
  level: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue>({
  status: "loading",
  userId: null,
  email: null,
  onboardingCompleted: false,
  placementCompleted: false,
  level: null,
  refresh: async () => {},
});

export function useAuth(): AuthContextValue {
  return React.useContext(AuthContext);
}

/** Backwards-compatible alias. */
export function useUser() {
  return useAuth();
}

function snapshotFromBootstrap(json: unknown): AuthSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const j = json as Record<string, unknown>;
  if (j.signedIn !== true) return null;
  const profile = (j.profile ?? {}) as Record<string, unknown>;
  return {
    userId: typeof j.userId === "string" ? j.userId : null,
    email: typeof j.email === "string" ? j.email : null,
    onboardingCompleted: profile.onboarding_completed === true,
    placementCompleted:
      profile.placement_completed === true ||
      (typeof profile.level === "string" && profile.level.length > 0),
    level: typeof profile.level === "string" ? profile.level : null,
  };
}

/**
 * Single client source of truth for auth state.
 * Initialized from server-provided data (no signed-out flash), kept live
 * with onAuthStateChange, refreshes server components after auth events.
 */
export function AuthProvider({
  initial,
  children,
}: {
  initial: AuthSnapshot & { status: Exclude<AuthStatus, "loading"> };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = React.useState<AuthSnapshot & { status: AuthStatus }>({
    ...initial,
    status: initial.status,
  });
  const stateRef = React.useRef(state);
  stateRef.current = state;

  const refresh = React.useCallback(async () => {
    try {
      let res = await fetch("/api/me/bootstrap", { cache: "no-store" });
      // Post-login / OAuth cookies can lag one tick behind the client event
      // (exchangeCodeForSession redirect, signInWithPassword flush). A single
      // delayed retry prevents a transient 401 from wiping a valid session.
      if (!res.ok && res.status === 401) {
        await new Promise((r) => setTimeout(r, 700));
        try {
          res = await fetch("/api/me/bootstrap", { cache: "no-store" });
        } catch {
          /* keep original 401 below */
        }
      }
      if (!res.ok) {
        // 401 -> anonymous; other errors keep current state to avoid flashing gates.
        if (res.status === 401) {
          const prev = stateRef.current;
          if (prev.userId) {
            try {
              clearUserScopedKeys(window.localStorage);
            } catch {
              /* noop */
            }
          }
          setState((s) =>
            s.status === "anonymous"
              ? s
              : {
                  status: "anonymous",
                  userId: null,
                  email: null,
                  onboardingCompleted: false,
                  placementCompleted: false,
                  level: null,
                }
          );
          // Reconcile server components with the demotion (avoids client/server split-brain loops).
          router.refresh();
        }
        return;
      }
      const json = await res.json().catch(() => null);
      const snap = snapshotFromBootstrap(json);
      if (!snap) {
        const prev = stateRef.current;
        if (prev.userId) {
          try {
            clearUserScopedKeys(window.localStorage);
          } catch {
            /* noop */
          }
        }
        setState((s) =>
          s.status === "anonymous"
            ? s
            : {
                status: "anonymous",
                userId: null,
                email: null,
                onboardingCompleted: false,
                placementCompleted: false,
                level: null,
              }
        );
        return;
      }
      setState({ ...snap, status: "authenticated" });
    } catch {
      /* keep current state on network failure */
    }
  }, [router]);

  React.useEffect(() => {
    let mounted = true;
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      // Backend not configured: honor the server-provided snapshot (anonymous).
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange(async (event) => {
      if (!mounted) return;
      const prev = stateRef.current;
      if (event === "SIGNED_OUT") {
        try {
          clearUserScopedKeys(window.localStorage);
        } catch {
          /* noop */
        }
        setState({
          status: "anonymous",
          userId: null,
          email: null,
          onboardingCompleted: false,
          placementCompleted: false,
          level: null,
        });
        router.refresh();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        // If we were anonymous and now have a session, re-hydrate from bootstrap.
        // If user id changed, reset client state first.
        try {
          const { data } = await supabase!.auth.getUser();
          const nextId = data.user?.id ?? null;
          if (nextId && prev.userId && nextId !== prev.userId) {
            try {
              clearUserScopedKeys(window.localStorage);
            } catch {
              /* noop */
            }
          }
        } catch {
          /* noop */
        }
        await refresh();
        router.refresh();
      }
    });
    // Reconcile once on mount (covers hard reload with a valid cookie).
    void refresh();
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh, router]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      userId: state.userId,
      email: state.email,
      onboardingCompleted: state.onboardingCompleted,
      placementCompleted: state.placementCompleted,
      level: state.level,
      refresh,
    }),
    [state, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
