"use client";

import { readJson } from "@/lib/api/response";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/feedback";

type Health = { ok: boolean; timestamp: string; commit: string | null; services: { supabase: string; gemini: string } };

export function HealthStatus({ labels }: { labels: { checking: string; healthy: string; degraded: string; updated: string } }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/health", { cache: "no-store", signal: controller.signal })
      .then((response) => readJson(response) as Promise<Health>)
      .then(setHealth)
      .catch(() => setFailed(true));
    return () => controller.abort();
  }, []);
  if (!health) return <p aria-live="polite" className="text-sm text-ink-600">{failed ? labels.degraded : labels.checking}</p>;
  return <div aria-live="polite" className="space-y-4"><Badge tone={health.ok ? "success" : "warning"}>{health.ok ? labels.healthy : labels.degraded}</Badge><dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm"><dt>Supabase</dt><dd className="font-semibold">{health.services.supabase}</dd><dt>Gemini</dt><dd className="font-semibold">{health.services.gemini}</dd>{health.commit && <><dt>Commit</dt><dd><code>{health.commit.slice(0, 8)}</code></dd></>}<dt>{labels.updated}</dt><dd>{new Date(health.timestamp).toLocaleString()}</dd></dl></div>;
}
