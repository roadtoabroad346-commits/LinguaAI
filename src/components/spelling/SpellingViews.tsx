"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { SPELLING_MODES, type SpellingMode } from "@/lib/spelling/spelling";
import { useTranslation } from "@/lib/i18n/I18nProvider";

interface SetItem {
  slug: string;
  word: string;
  level: string;
  definition: string;
  example: string;
  phonetic: string;
  masked?: string;
  choices?: string[];
}

interface SetPayload {
  mode: SpellingMode;
  level: string;
  items: SetItem[];
  xpPerCorrect: number;
  bonusXp: number;
}

interface GradePayload {
  score: number;
  total: number;
  correctSlugs: string[];
  wrongSlugs: string[];
  xpEarned: number;
  perfect: boolean;
  saved: boolean;
  repeated?: boolean;
  xpAwarded?: number;
  newAchievements?: string[];
}

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // fall through to fallback below
  }
  // RFC 4122 v4 fallback — must stay a valid UUID: the API schema
  // requires uuid() and Postgres stores session_id in uuid columns.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const LEVELS = ["all", "A1", "A2", "B1", "B2", "C1"] as const;

function speak(text: string) {
  if (!("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
  return true;
}

export function SpellingViews() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SpellingMode>("listen");
  const [level, setLevel] = useState<string>("all");
  const [set, setSet] = useState<SetPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<GradePayload | null>(null);
  const [ttsOk, setTtsOk] = useState(true);
  const [savedWords, setSavedWords] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string>(() => newSessionId());

  // `t` intentionally omitted: the word set must not reload on language switch.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setResult(null);
    setTyped({});
    setSelected({});
    setSavedWords([]);
    setSessionId(newSessionId());
    try {
      const params = new URLSearchParams({ mode, count: "8", seed: new Date().toISOString().slice(0, 10) });
      if (level !== "all") params.set("level", level);
      const res = await fetch(`/api/spelling/set?${params.toString()}`);
      if (!res.ok) throw new Error("load");
      setSet(await res.json());
    } catch {
      setLoadError(t("learn.couldNotLoadWords"));
    } finally {
      setLoading(false);
    }
    // Load-once per mode/level: must not reload on language switch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, level]);

  useEffect(() => {
    setTtsOk("speechSynthesis" in window);
    load();
  }, [load]);

  async function submit() {
    if (!set) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answers = set.items.map((item) =>
        mode === "choice"
          ? { slug: item.slug, selected: selected[item.slug] ?? -1, choices: item.choices ?? [] }
          : { slug: item.slug, typed: typed[item.slug] ?? "" }
      );
      const res = await fetch("/api/spelling/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, level: level === "all" ? undefined : level, sessionId, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not submit.");
      setResult(json);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : t("learn.couldNotSubmit"));
    } finally {
      setSubmitting(false);
    }
  }

  async function saveMissed() {
    if (!result) return;
    for (const slug of result.wrongSlugs) {
      try {
        const res = await fetch("/api/dictionary", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ word: slug }),
        });
        if (res.ok) setSavedWords((s) => (s.includes(slug) ? s : [...s, slug]));
      } catch {
        // Per-word failure is non-fatal.
      }
    }
  }

  const answered = set?.items.filter((i) => (mode === "choice" ? selected[i.slug] !== undefined && selected[i.slug] >= 0 : (typed[i.slug] ?? "").trim().length > 0)).length ?? 0;
  const allAnswered = set !== null && answered === set.items.length;

  const modeTitle = (id: SpellingMode) =>
    id === "listen" ? t("learn.modeListen")
    : id === "meaning" ? t("learn.modeMeaning")
    : id === "missing" ? t("learn.modeMissing")
    : t("learn.modeChoice");
  const modeDesc = (id: SpellingMode) =>
    id === "listen" ? t("learn.modeListenDesc")
    : id === "meaning" ? t("learn.modeMeaningDesc")
    : id === "missing" ? t("learn.modeMissingDesc")
    : t("learn.modeChoiceDesc");
  const itemPrompt = (item: SetItem) =>
    mode === "listen" ? t("learn.listenType")
    : mode === "meaning" ? t("learn.meaningType")
    : mode === "missing" ? t("learn.completeMasked", { masked: item.masked ?? "" })
    : t("learn.chooseSpelling");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("learn.spellingModes")}>
        {SPELLING_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => setMode(m.id)}
            className={`min-w-0 rounded-full border px-3 py-1.5 text-sm font-medium ${mode === m.id ? "border-brand-600 bg-brand-600 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"}`}
          >
            {modeTitle(m.id)}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-500">{modeDesc(mode)} {t("learn.wordsFromLevel")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="spelling-level" className="text-sm font-medium text-ink-700">{t("learn.level")}</label>
        <select
          id="spelling-level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>{l === "all" ? t("learn.mixed") : l}</option>
          ))}
        </select>
        <Button size="sm" variant="secondary" onClick={load} loading={loading}>{t("learn.newSet")}</Button>
        <Link href="/progress" className="text-sm font-semibold text-brand-700 underline">{t("dashboard.cards.viewProgress")}</Link>
      </div>

      {loadError && (
        <Card>
          <Alert tone="danger" title={t("learn.couldNotLoadWordsTitle")}>{loadError}</Alert>
          <div className="mt-3"><Button variant="secondary" onClick={load}>{t("common.retry")}</Button></div>
        </Card>
      )}

      {loading && (
        <Card aria-busy="true" aria-label={t("learn.loadingWordsTitle")}>
          <CardTitle>{t("learn.loadingWords")}</CardTitle>
          <div className="mt-4 space-y-3" aria-hidden>
            {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-100" />)}
          </div>
        </Card>
      )}

      {!loading && !loadError && set && !result && (
        <div className="space-y-3">
          {mode === "listen" && !ttsOk && (
            <Alert tone="warning" title={t("learn.audioUnavailable")}>{t("learn.audioUnavailableDesc")}</Alert>
          )}
          {set.items.map((item, i) => (
            <Card key={item.slug}>
              <p className="text-sm font-semibold">{i + 1}. {itemPrompt(item)}</p>
              {mode !== "listen" && <p className="mt-1 text-sm text-ink-500">{item.definition}</p>}
              {mode === "meaning" && <p className="mt-1 text-sm italic text-ink-400">{t("learn.example")}: “{item.example}”</p>}
              {mode === "listen" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => speak(item.word)} disabled={!ttsOk}>{t("learn.playWord")}</Button>
                  <span className="text-xs text-ink-500">{item.definition}</span>
                </div>
              )}
              {mode === "choice" && item.choices ? (
                <div className="mt-2 grid gap-2" role="radiogroup" aria-label={t("learn.wordIndex", { n: i + 1 })}>
                  {item.choices.map((c, ci) => {
                    const isSel = selected[item.slug] === ci;
                    return (
                      <button
                        key={ci}
                        type="button"
                        role="radio"
                        aria-checked={isSel}
                        onClick={() => setSelected((s) => ({ ...s, [item.slug]: ci }))}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${isSel ? "border-brand-600 bg-brand-50 font-medium" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50"}`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <label className="mt-2 block">
                  <span className="sr-only">{t("learn.yourSpellingFor", { n: i + 1 })}</span>
                  <input
                    value={typed[item.slug] ?? ""}
                    onChange={(e) => setTyped((t) => ({ ...t, [item.slug]: e.target.value }))}
                    placeholder={t("learn.typeWordPlaceholder")}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              )}
            </Card>
          ))}
          {submitError && <Alert tone="danger" title={t("learn.submitFailed")}>{submitError}</Alert>}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={submit} loading={submitting} disabled={!allAnswered || submitting}>
              {t("learn.checkCount", { a: answered, b: set.items.length })}
            </Button>
            {!allAnswered && <span className="text-xs text-ink-500">{t("learn.answerEveryWord")}</span>}
          </div>
        </div>
      )}

      {result && set && (
        <Card>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <CardTitle className="min-w-0 flex-1 truncate">{result.perfect ? t("learn.perfectSpelling") : result.score >= Math.ceil(result.total * 0.6) ? t("learn.wellDone") : t("learn.goodEffort")}</CardTitle>
            <Badge tone={result.score >= Math.ceil(result.total * 0.6) ? "success" : "warning"} className="shrink-0">{result.score}/{result.total}</Badge>
          </div>
          <CardDescription>
            {result.repeated
              ? `${t("common.xpValue", { count: result.xpAwarded ?? 0 })} ${t("learn.xpCounted")}`
              : result.saved
                ? t("learn.xpSaved", { xp: result.xpEarned })
                : t("learn.xpPreview", { xp: result.xpEarned })}
            {result.newAchievements && result.newAchievements.length > 0 && ` ${t("learn.unlocked", { names: result.newAchievements.join(", ") })}`}
          </CardDescription>
          <ul className="mt-3 space-y-2">
            {set.items.map((item) => {
              const ok = result.correctSlugs.includes(item.slug);
              return (
                <li key={item.slug} className={`rounded-xl border px-3 py-2 text-sm ${ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                  <span className="font-semibold">{ok ? "✓" : "✗"} {item.word}</span>
                  <span className="text-ink-500"> {item.phonetic} · {item.definition}</span>
                  {!ok && mode !== "choice" && <span className="block text-xs">{t("learn.youTyped", { text: (typed[item.slug] ?? "").trim() || "—" })}</span>}
                </li>
              );
            })}
          </ul>
          {result.wrongSlugs.length > 0 && (
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={saveMissed} disabled={savedWords.length >= result.wrongSlugs.length}>
                {savedWords.length >= result.wrongSlugs.length ? t("learn.savedToDict", { n: savedWords.length }) : t("learn.saveMissed", { a: savedWords.length, b: result.wrongSlugs.length })}
              </Button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={load}>{t("learn.practiceAgain")}</Button>
            <Link href="/vocabulary"><Button size="sm" variant="secondary">{t("learn.reviewVocab")}</Button></Link>
            <Link href="/progress"><Button size="sm" variant="ghost">{t("nav.progress")}</Button></Link>
          </div>
        </Card>
      )}
    </div>
  );
}
