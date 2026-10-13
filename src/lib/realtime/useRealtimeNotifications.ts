"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Private, user-scoped Realtime Broadcast subscriptions (migration 0021).
 *
 * Topics (server triggers via realtime.broadcast_changes, level=private):
 *   user:<uid>:notifications  — INSERT/UPDATE/DELETE on public.notifications
 *   user:<uid>:progress       — INSERT on public.xp_events + public.achievements
 *
 * Security: channels are private (config.private=true). Receivers are
 * authorized by the narrow RLS policy "own-user-broadcast" on
 * realtime.messages: topic LIKE 'user:' || auth.uid() || ':%'.
 * No blanket public access. Polling remains as fallback (platform incidents,
 * offline, or realtime extension unavailable locally).
 */

type BroadcastPayload = {
  event: string;
  payload?: unknown;
};

export function topicFor(userId: string, kind: "notifications" | "progress"): string {
  return `user:${userId}:${kind}`;
}

export function useRealtimeNotifications(opts: {
  /** Authenticated user id; null/undefined disables subscription. */
  userId: string | null | undefined;
  /** Called on any notification INSERT/UPDATE/DELETE broadcast. */
  onNotification?: (info: { event: string; payload: unknown }) => void;
  /** Called on any xp/achievement INSERT broadcast (live progress). */
  onProgress?: (info: { event: string; payload: unknown }) => void;
  enabled?: boolean;
}) {
  const { userId, onNotification, onProgress, enabled = true } = opts;
  const notifRef = useRef(onNotification);
  const progressRef = useRef(onProgress);
  notifRef.current = onNotification;
  progressRef.current = onProgress;

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;
    let channel: { unsubscribe: () => void } | null = null;
    let progressChannel: { unsubscribe: () => void } | null = null;

    (async () => {
      try {
        const supabase = createClient();
        // Refresh realtime auth context so RLS on realtime.messages sees the JWT.
        try {
          await (supabase.realtime as unknown as { setAuth?: () => Promise<void> }).setAuth?.();
        } catch {
          /* older client or no session yet — subscribe still attempts */
        }

        if (cancelled) return;

        if (notifRef.current) {
          const ch = supabase.channel(topicFor(userId, "notifications"), {
            config: { private: true },
          });
          ch.on("broadcast", { event: "*" }, (msg: BroadcastPayload) => {
            try {
              notifRef.current?.({ event: msg.event, payload: msg.payload });
            } catch {
              /* never break the socket on a UI callback */
            }
          });
          ch.subscribe();
          channel = ch as unknown as { unsubscribe: () => void };
        }

        if (progressRef.current) {
          const ch2 = supabase.channel(topicFor(userId, "progress"), {
            config: { private: true },
          });
          ch2.on("broadcast", { event: "*" }, (msg: BroadcastPayload) => {
            try {
              progressRef.current?.({ event: msg.event, payload: msg.payload });
            } catch {
              /* ignore */
            }
          });
          ch2.subscribe();
          progressChannel = ch2 as unknown as { unsubscribe: () => void };
        }
      } catch {
        /* Realtime unavailable (platform incident/offline): polling fallback covers it. */
      }
    })();

    return () => {
      cancelled = true;
      try {
        channel?.unsubscribe();
      } catch {
        /* ignore */
      }
      try {
        progressChannel?.unsubscribe();
      } catch {
        /* ignore */
      }
    };
  }, [userId, enabled]);
}
