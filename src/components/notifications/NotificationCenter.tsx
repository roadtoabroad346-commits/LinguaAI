"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  BookOpen,
  CheckCheck,
  Clock,
  Flag,
  Flame,
  Info,
  Layers,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/lib/notifications/types";

const ICONS: Record<string, typeof Bell> = {
  onboarding: Flag,
  learning: BookOpen,
  review: Layers,
  goal: Target,
  streak: Flame,
  challenge: Zap,
  skills: Sparkles,
  milestone: Trophy,
  weekly: BarChart3,
  system: Info,
};

interface CenterResponse {
  items?: NotificationRow[];
  unreadCount?: number;
  unavailable?: boolean;
  error?: string;
}

function varsOf(row: NotificationRow): Record<string, string | number> {
  return (row.vars ?? {}) as Record<string, string | number>;
}

/** Header bell with unread badge + responsive center panel (sheet on mobile). */
export function NotificationBell() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (view: "active" | "history") => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/notifications?view=${view}&limit=20`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as CenterResponse | null;
      if (!res.ok) throw new Error(json?.error ?? "load");
      setItems(json?.items ?? []);
      setUnread(json?.unreadCount ?? 0);
      setUnavailable(json?.unavailable === true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?view=active&limit=1", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as CenterResponse | null;
      if (res.ok && json) {
        setUnread(json.unreadCount ?? 0);
        setUnavailable(json.unavailable === true);
      }
    } catch {
      /* silent: badge just stays stale */
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = window.setInterval(refreshCount, 5 * 60 * 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") refreshCount();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshCount]);

  useEffect(() => {
    if (open) {
      load(tab);
      closeRef.current?.focus();
    }
  }, [open, tab, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  async function act(ids: string[], action: "read" | "dismiss" | "snooze") {
    setActing(ids.join(","));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, snoozeHours: 24 }),
      }).catch(() => null);
    } finally {
      setActing(null);
    }
  }

  async function openItem(row: NotificationRow) {
    if (!row.read_at) {
      act([row.id], "read").catch(() => {});
      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, read_at: new Date().toISOString() } : i)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    router.push(row.href);
  }

  async function dismissItem(row: NotificationRow) {
    await act([row.id], "dismiss");
    setItems((prev) => prev.filter((i) => i.id !== row.id));
    if (!row.read_at) setUnread((u) => Math.max(0, u - 1));
  }

  async function snoozeItem(row: NotificationRow) {
    await act([row.id], "snooze");
    setItems((prev) => prev.filter((i) => i.id !== row.id));
    if (!row.read_at) setUnread((u) => Math.max(0, u - 1));
  }

  async function markAllRead() {
    const ids = items.filter((i) => !i.read_at).map((i) => i.id);
    if (ids.length === 0) return;
    await act(ids, "read");
    setItems((prev) => prev.map((i) => ({ ...i, read_at: i.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={t("notif.center")}
        className="touch-44 relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-ink-200/70 bg-white text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span aria-hidden className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-40 bg-ink-950/40 md:hidden" onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("notif.center")}
            className="fixed inset-x-3 bottom-24 z-50 md:absolute md:inset-x-auto md:bottom-auto md:right-0 md:top-12 md:w-[26rem]"
          >
            <Card className="max-h-[70dvh] overflow-hidden p-0">
              <div className="flex items-center justify-between gap-2 border-b border-ink-200/70 p-4 dark:border-ink-700">
                <CardTitle>{t("notif.center")}</CardTitle>
                <div className="flex shrink-0 items-center gap-1">
                  {tab === "active" && unread > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllRead}>
                      <CheckCheck className="h-4 w-4" /> {t("notif.markAllRead")}
                    </Button>
                  )}
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("common.close")}
                    className="touch-44 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                </div>
              </div>
              <div className="flex gap-1 border-b border-ink-200/70 px-4 py-2 dark:border-ink-700" role="tablist" aria-label={t("notif.center")}>
                {(["active", "history"] as const).map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={tab === v}
                    type="button"
                    onClick={() => setTab(v)}
                    className={cn(
                      "touch-44 rounded-full px-4 text-sm font-semibold",
                      tab === v ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200" : "text-ink-500"
                    )}
                  >
                    {v === "active" ? t("notif.active") : t("notif.history")}
                  </button>
                ))}
              </div>
              <div className="max-h-[52dvh] overflow-y-auto p-3 md:max-h-[24rem]">
                {loading && <p className="p-4 text-center text-sm text-ink-500">{t("common.loading")}</p>}
                {!loading && failed && (
                  <div className="p-2">
                    <Alert tone="danger" title={t("common.loadFailed")}>
                      <Button variant="secondary" size="sm" onClick={() => load(tab)}>{t("common.retry")}</Button>
                    </Alert>
                  </div>
                )}
                {!loading && !failed && unavailable && (
                  <p className="p-4 text-center text-sm text-ink-500">{t("notif.unavailable")}</p>
                )}
                {!loading && !failed && !unavailable && items.length === 0 && (
                  <div className="p-6 text-center">
                    <Bell className="mx-auto h-8 w-8 text-ink-300 dark:text-ink-600" aria-hidden />
                    <p className="mt-2 text-sm font-bold">{tab === "active" ? t("notif.empty") : t("notif.historyEmpty")}</p>
                    <p className="mt-1 text-xs text-ink-500">{t("notif.emptyDesc")}</p>
                  </div>
                )}
                <ul className="grid gap-2">
                  {items.map((row) => {
                    const Icon = ICONS[row.category] ?? Info;
                    const busy = acting !== null && acting.includes(row.id);
                    return (
                      <li
                        key={row.id}
                        className={cn(
                          "rounded-2xl border p-3",
                          row.read_at
                            ? "border-ink-200/60 bg-white dark:border-ink-800 dark:bg-ink-900"
                            : "border-brand-200 bg-brand-50/60 dark:border-brand-800 dark:bg-brand-950/40"
                        )}
                      >
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span aria-hidden className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          <button type="button" onClick={() => openItem(row)} className="min-w-0 flex-1 text-left">
                            <span className="block truncate text-sm font-bold">{t(row.title_key, varsOf(row))}</span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-ink-600 dark:text-ink-300">
                              {t(row.body_key, varsOf(row))}
                            </span>
                            <span className="mt-1 block text-[11px] text-ink-400">
                              {new Date(row.created_at).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                            </span>
                          </button>
                          <span className="flex shrink-0 flex-col gap-1">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => snoozeItem(row)}
                              aria-label={t("notif.snoozeDay")}
                              title={t("notif.snoozeDay")}
                              className="touch-44 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-50 dark:hover:bg-ink-800"
                            >
                              <Clock className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => dismissItem(row)}
                              aria-label={t("notif.dismiss")}
                              title={t("notif.dismiss")}
                              className="touch-44 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-400 hover:bg-ink-100 hover:text-ink-700 disabled:opacity-50 dark:hover:bg-ink-800"
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <Link href="/profile#notifications" onClick={() => setOpen(false)} className="mt-2 block px-1 py-2 text-center text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300">
                  {t("notif.manage")}
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
