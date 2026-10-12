"use client";

import { useEffect } from "react";

/** djb2 — only for the localStorage dedupe key; the real id is computed server-side. */
function fpKey(o: Record<string, unknown>): string {
  const s = JSON.stringify(o);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/**
 * One-shot device beacon: collects a modest, non-biometric fingerprint
 * (platform/screen/timezone/language + first-touch marketing context) and
 * POSTs it to /api/security/device. Silent on failure; never blocks UI.
 * Mount once in the root layout for signed-in users.
 */
export function DeviceBeacon() {
  useEffect(() => {
    try {
      const nav = window.navigator as Navigator & {
        userAgentData?: { platform?: string };
        deviceMemory?: number;
      };
      const params = new URLSearchParams(window.location.search);
      const payload = {
        platform: nav.userAgentData?.platform ?? nav.platform ?? "unknown",
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "unknown",
        language: nav.language ?? "unknown",
        cores: nav.hardwareConcurrency ?? 0,
        memoryGb: nav.deviceMemory ?? 0,
        touch: "ontouchstart" in window || navigator.maxTouchPoints > 0,
        landing: window.location.pathname.slice(0, 200),
        referrer: document.referrer.slice(0, 500),
        utmSource: (params.get("utm_source") ?? "").slice(0, 100),
        utmMedium: (params.get("utm_medium") ?? "").slice(0, 100),
        utmCampaign: (params.get("utm_campaign") ?? "").slice(0, 100),
      };
      const key = `linguaai_dev_sent:${fpKey(payload)}`;
      if (window.localStorage.getItem(key)) return;
      fetch("/api/security/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((r) => {
          if (r.ok) window.localStorage.setItem(key, "1");
        })
        .catch(() => {});
    } catch {
      /* never break the app for telemetry */
    }
  }, []);
  return null;
}
