"use client";

import { readJson } from "@/lib/api/response";

import { useEffect, useState } from "react";
import { BellOff, Mail, Smartphone } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { Alert } from "@/components/ui/feedback";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { DEFAULT_PREFS, NOTIF_CATEGORIES, type NotifPrefs } from "@/lib/notifications/types";

const CATEGORY_ICON_HINT: Record<string, string> = {
  onboarding: "🚩",
  learning: "📖",
  review: "🗂️",
  goal: "🎯",
  streak: "🔥",
  challenge: "⚡",
  skills: "✨",
  milestone: "🏆",
  weekly: "📊",
  system: "ℹ️",
};

/** Full notification preferences (id="notifications" anchor target on /profile). */
export function NotificationSettings() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences", { cache: "no-store" })
      .then((r) => readJson(r))
      .then((j) => {
        if (j?.prefs) setPrefs({ ...DEFAULT_PREFS, ...j.prefs, categories: { ...DEFAULT_PREFS.categories, ...(j.prefs.categories ?? {}) } });
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  async function save(next: NotifPrefs) {
    setPrefs(next);
    setSaving(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        setSavedTick(true);
        window.setTimeout(() => setSavedTick(false), 1500);
      }
    } catch {
      /* keep local state; next load reconciles */
    } finally {
      setSaving(false);
    }
  }

  const patch = (p: Partial<NotifPrefs>) => {
    if (!prefs) return;
    save({ ...prefs, ...p });
  };

  return (
    <Card>
      <CardTitle>{t("notif.settingsTitle")}</CardTitle>
      <CardDescription>{t("notif.settingsDesc")}</CardDescription>
      {!prefs && !failed && <p className="mt-3 text-sm text-ink-500">{t("common.loading")}</p>}
      {failed && (
        <div className="mt-3">
          <Alert tone="danger" title={t("common.loadFailed")}>{t("notif.settingsUnavailable")}</Alert>
        </div>
      )}
      {prefs && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">{t("notif.enabled")}</p>
            <Switch on={prefs.enabled} onFlip={() => patch({ enabled: !prefs.enabled })} label={t("notif.enabled")} />
          </div>

          <fieldset disabled={!prefs.enabled} className={prefs.enabled ? undefined : "opacity-50"}>
            <legend className="text-sm font-bold">{t("notif.categories")}</legend>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {NOTIF_CATEGORIES.filter((c) => c !== "system").map((c) => (
                <li key={c} className="flex items-center justify-between gap-3 rounded-2xl border border-ink-200/70 py-1 pl-3 pr-1 dark:border-ink-700">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span aria-hidden className="mr-1.5">{CATEGORY_ICON_HINT[c]}</span>
                    {t(`notif.cat_${c}`)}
                  </span>
                  <Switch
                    on={prefs.categories[c]}
                    onFlip={() => patch({ categories: { ...prefs.categories, [c]: !prefs.categories[c] } })}
                    label={t(`notif.cat_${c}`)}
                  />
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block text-sm">
                <span className="font-semibold">{t("notif.reminderTime")}</span>
                <input
                  type="time"
                  value={prefs.reminderTime}
                  onChange={(e) => e.target.value && patch({ reminderTime: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">{t("notif.quietFrom")}</span>
                <input
                  type="time"
                  value={prefs.quietFrom}
                  onChange={(e) => e.target.value && patch({ quietFrom: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900"
                />
              </label>
              <label className="block text-sm">
                <span className="font-semibold">{t("notif.quietTo")}</span>
                <input
                  type="time"
                  value={prefs.quietTo}
                  onChange={(e) => e.target.value && patch({ quietTo: e.target.value })}
                  className="mt-1 h-11 w-full rounded-xl border border-ink-200 bg-white px-3 dark:border-ink-700 dark:bg-ink-900"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-sm font-bold">{t("notif.dailyMax")}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" disabled={saving || prefs.dailyMax <= 1} onClick={() => patch({ dailyMax: prefs.dailyMax - 1 })} aria-label="−">−</Button>
                <span className="w-8 text-center text-sm font-bold tabular-nums" aria-live="polite">{prefs.dailyMax}</span>
                <Button variant="secondary" size="sm" disabled={saving || prefs.dailyMax >= 20} onClick={() => patch({ dailyMax: prefs.dailyMax + 1 })} aria-label="+">+</Button>
              </div>
            </div>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-start gap-2.5 rounded-2xl border border-ink-200/70 p-3 dark:border-ink-700">
              <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold">{t("notif.pushTitle")}</p>
                <p className="text-xs leading-relaxed text-ink-500">{t("notif.pushDisabled")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 rounded-2xl border border-ink-200/70 p-3 dark:border-ink-700">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-bold">{t("notif.emailTitle")}</p>
                <p className="text-xs leading-relaxed text-ink-500">{t("notif.emailDisabled")}</p>
              </div>
            </div>
          </div>
          {savedTick && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{t("notif.saved")}</p>}
          {!prefs.enabled && (
            <p className="flex items-center gap-1.5 text-xs text-ink-500"><BellOff className="h-4 w-4" aria-hidden />{t("notif.disabledNote")}</p>
          )}
        </div>
      )}
    </Card>
  );
}
