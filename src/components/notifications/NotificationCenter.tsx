"use client";

import { readJson } from "@/lib/api/response";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import { useRealtimeNotifications } from "@/lib/realtime/useRealtimeNotifications";

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
  items?: NotificationRowLite[];
  unreadCount?: number;
  unavailable?: boolean;
  error?: string;
}

interface NotificationRowLite {
  id: string;
  category: string;
  title_key: string;
  body_key: string;
  vars?: Record<string, string | number> | null;
  href: string;
  read_at: string | null;
  created_at: string;
}

function varsOf(row: NotificationRowLite): Record<string, string | number> {
  return (row.vars ?? {}) as Record<string, string | number>;
}

function isSafeHref(href: unknown): href is string {
  return typeof href === "string" && href.startsWith("/") && !href.startsWith("//");
}

/**
 * Header bell with unread badge + notification center.
 *
 * Senior fix for mobile "tap does nothing":
 * The old version rendered `position:fixed` dropdown INSIDE `header.glass`
 * (backdrop-filter). Per spec, backdrop-filter / filter creates a containing
 * block for fixed descendants, so the sheet was positioned relative to the
 * 64px header and trapped in its stacking context (z-30) — on phones it was
 * clipped/invisible. Now the overlay is portalled to document.body with a
 * viewport-relative bottom-sheet position above the tab bar.
 */
export function NotificationBell() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"active" | "history">("active");
  const [items, setItems] = useState<NotificationRowLite[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async (view: "active" | "history") => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/notifications?view=${view}&limit=20`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      const json = (await readJson(res).catch(() => null)) as CenterResponse | null;
      if (!res.ok) throw new Error(json?.error ?? "load");
      setItems(Array.isArray(json?.items) ? (json?.items ?? []) : []);
      setUnread(typeof json?.unreadCount === "number" ? json.unreadCount : 0);
      setUnavailable(json?.unavailable === true);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setFailed(true);
    } finally {
      if (abortRef.current === ctrl) setLoading(false);
    }
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?view=active&limit=1", { cache: "no-store" });
      const json = (await readJson(res).catch(() => null)) as CenterResponse | null;
      if (res.ok && json) {
        setUnread(typeof json.unreadCount === "number" ? json.unreadCount : 0);
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

  // Resolve the signed-in user id once (cookie session) for private channels.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (alive) setUserId(data.user?.id ?? null);
      } catch {
        if (alive) setUserId(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Live updates: private Broadcast (migration 0021) with polling fallback above.
  // Any notification change refreshes the badge; when the center is open, reload
  // the active list so inserts/deletes appear without a manual refresh.
  const openRef = useRef(open);
  const tabRef = useRef(tab);
  useEffect(() => {
    openRef.current = open;
    tabRef.current = tab;
  }, [open, tab]);
  useRealtimeNotifications({
    userId,
    onNotification: () => {
      void refreshCount();
      if (openRef.current) void load(tabRef.current);
    },
  });

  useEffect(() => {
    if (open) {
      load(tab);
      // Focus close after paint so VoiceOver/Switch lands inside dialog.
      const raf = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [open, tab, load]);

  // Escape closes + body scroll lock while open (mobile sheet covers viewport).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  async function act(ids: string[], action: "read" | "dismiss" | "snooze") {
    const key = ids.join(",");
    setActing(key);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action, snoozeHours: 24 }),
      }).catch(() => null);
    } finally {
      setActing((cur) => (cur === key ? null : cur));
    }
  }

  function openItem(row: NotificationRowLite) {
    if (!isSafeHref(row.href)) {
      setOpen(false);
      return;
    }
    if (!row.read_at) {
      void act([row.id], "read");
      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, read_at: new Date().toISOString() } : i)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    router.push(row.href);
  }

  async function dismissItem(row: NotificationRowLite) {
    await act([row.id], "dismiss");
    setItems((prev) => prev.filter((i) => i.id !== row.id));
    if (!row.read_at) setUnread((u) => Math.max(0, u - 1));
  }

  async function snoozeItem(row: NotificationRowLite) {
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
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t("notif.center")}
        className="touch-44 relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink-200/70 bg-white text-ink-600 transition-colors hover:border-brand-300 hover:text-brand-700 active:scale-95 sm:h-11 sm:w-11 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold tabular-nums text-white"
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {unread > 0 && <span className="sr-only">{unread}</span>}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[80]">
            {/* Backdrop: dim + blocks page taps on mobile, transparent click-catcher on desktop */}
            <div
              aria-hidden
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-ink-950/45 md:bg-transparent"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("notif.center")}
              className={cn(
                "absolute inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))]",
                "md:inset-x-auto md:bottom-auto md:right-4 md:top-16 md:w-[26rem]"
              )}
            >
              <Card className="max-h-[min(70dvh,34rem)] overflow-hidden p-0 shadow-sheet">
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
                <div
                  className="flex gap-1 border-b border-ink-200/70 px-4 py-2 dark:border-ink-700"
                  role="tablist"
                  aria-label={t("notif.center")}
                >
                  {(["active", "history"] as const).map((v) => (
                    <button
                      key={v}
                      role="tab"
                      aria-selected={tab === v}
                      type="button"
                      onClick={() => setTab(v)}
                      className={cn(
                        "touch-44 min-h-[44px] rounded-full px-4 text-sm font-semibold",
                        tab === v
                          ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                          : "text-ink-500"
                      )}
                    >
                      {v === "active" ? t("notif.active") : t("notif.history")}
                    </button>
                  ))}
                </div>
                <div className="max-h-[52dvh] overflow-y-auto overscroll-contain p-3 md:max-h-[24rem]">
                  {loading && <p className="p-4 text-center text-sm text-ink-500">{t("common.loading")}</p>}
                  {!loading && failed && (
                    <div className="p-2">
                      <Alert tone="danger" title={t("common.loadFailed")}>
                        <Button variant="secondary" size="sm" onClick={() => load(tab)}>
                          {t("common.retry")}
                        </Button>
                      </Alert>
                    </div>
                  )}
                  {!loading && !failed && unavailable && (
                    <p className="p-4 text-center text-sm text-ink-500">{t("notif.unavailable")}</p>
                  )}
                  {!loading && !failed && !unavailable && items.length === 0 && (
                    <div className="p-6 text-center">
                      <Bell className="mx-auto h-8 w-8 text-ink-300 dark:text-ink-600" aria-hidden />
                      <p className="mt-2 text-sm font-bold">
                        {tab === "active" ? t("notif.empty") : t("notif.historyEmpty")}
                      </p>
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
                            <span
                              aria-hidden
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-200"
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <button
                              type="button"
                              onClick={() => openItem(row)}
                              className="min-w-0 flex-1 text-left"
                            >
                              <span className="block truncate text-sm font-bold">
                                {t(row.title_key, varsOf(row))}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-ink-600 dark:text-ink-300">
                                {t(row.body_key, varsOf(row))}
                              </span>
                              <span className="mt-1 block text-[11px] text-ink-400">
                                {new Date(row.created_at).toLocaleDateString(locale, {
                                  month: "short",
                                  day: "numeric",
                                })}
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
                  <Link
                    href="/profile#notifications"
                    onClick={() => setOpen(false)}
                    className="mt-2 block px-1 py-2 text-center text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300"
                  >
                    {t("notif.manage")}
                  </Link>
                </div>
              </Card>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
