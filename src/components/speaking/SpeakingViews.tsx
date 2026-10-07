"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Alert, Badge, EmptyState, Progress } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LEVELS } from "@/lib/constants";
import { countWords, type SpeakingTopic } from "@/lib/speaking/topics";
import type { ReadAloudPassage } from "@/lib/readaloud/passages";
import { useTranslation } from "@/lib/i18n/I18nProvider";

type TopicSummary = Pick<SpeakingTopic, "slug" | "level" | "title" | "prompt" | "questions" | "minWords" | "targetSecs" | "usefulPhrases">;
type PassageSummary = Pick<ReadAloudPassage, "slug" | "level" | "title" | "text" | "focus">;

/* ---------- browser speech helpers (no extra deps) ---------- */

function hasRecognition(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

function hasTts(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak text aloud via the browser (Web Speech TTS). No server/audio API needed. */
export function speakText(text: string, opts?: { rate?: number }): void {
  if (!hasTts()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.slice(0, 1500));
  u.lang = "en-US";
  u.rate = opts?.rate ?? 0.95;
  const voices = window.speechSynthesis.getVoices();
  const en = voices.find((v) => v.lang.startsWith("en") && v.localService) ?? voices.find((v) => v.lang.startsWith("en"));
  if (en) u.voice = en;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (hasTts()) window.speechSynthesis.cancel();
}

function formatSecs(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, "0")}` : `${r}s`;
}

/* ---------- shared recorder hook ---------- */

function useRecorder(t: (key: string) => string) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported] = useState(() => typeof window !== "undefined" && "MediaRecorder" in window);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        setAudioUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(blob); });
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start();
      setRecording(true);
    } catch {
      setError(t("learn.micBlocked"));
    }
  }, [t]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setRecording(false);
  }, []);

  useEffect(() => () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    stopSpeaking();
  }, [audioUrl]);

  return { recording, audioUrl, error, supported, start, stop };
}

/* ---------- live transcript via Web Speech API ---------- */

function useLiveTranscript(t: (key: string) => string) {
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [supported] = useState(hasRecognition);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<{ stop(): void } | null>(null);

  const start = useCallback(() => {
    setError(null);
    try {
      const w = window as unknown as Record<string, new () => {
        lang: string; interimResults: boolean; continuous: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
        start(): void; stop(): void;
      }>;
      const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!Ctor) { setError(t("learn.liveUnsupported")); return; }
      const rec = new Ctor();
      recRef.current = rec;
      rec.lang = "en-US";
      rec.interimResults = true;
      rec.continuous = true;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const part = e.results[i][0]?.transcript ?? "";
          interim += part + " ";
        }
        void finalText;
        setTranscript(interim.trim());
      };
      rec.onerror = (e) => {
        setListening(false);
        if (e.error === "not-allowed") setError(t("learn.micBlockedShort"));
        else if (e.error !== "aborted") setError(t("learn.transStopped"));
      };
      rec.onend = () => setListening(false);
      rec.start();
      setListening(true);
    } catch {
      setError(t("learn.couldNotStartTrans"));
    }
  }, [t]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* noop */ }
    setListening(false);
  }, []);

  return { transcript, setTranscript, listening, supported, error, start, stop };
}

/* ================= TOPIC TALK ================= */

interface SpeakResult {
  score: number; wordCount: number; wpm: number; fillerCount: number;
  issues: Array<{ category: string; message: string; example?: string }>;
  strengths: string[]; modelAnswer: string; feedback: string[]; recommendations: string[];
  xpEarned: number; saved: boolean; ai: boolean;
}

function TopicPractice({ topic, onBack }: { topic: TopicSummary; onBack: () => void }) {
  const { t } = useTranslation();
  const rec = useRecorder(t);
  const live = useLiveTranscript(t);
  const [manual, setManual] = useState("");
  const [secs, setSecs] = useState(0);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<SpeakResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const active = rec.recording || live.listening;
  const transcript = (live.transcript || manual).trim();
  const words = countWords(transcript);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  function startAll() {
    setResult(null); setError(null); setSecs(0);
    void rec.start();
    if (hasRecognition()) live.start();
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
  }
  function stopAll() {
    rec.stop(); live.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setManual((m) => (live.transcript && !m ? live.transcript : m));
  }

  async function check() {
    setChecking(true); setError(null);
    try {
      const res = await fetch("/api/speaking/feedback", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicSlug: topic.slug, transcript, durationSecs: secs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.feedbackFailedDesc"));
      setResult(json);
      if (json.modelAnswer) speakText(json.modelAnswer);
    } catch (e) { setError(e instanceof Error ? e.message : t("learn.couldNotCheck")); }
    finally { setChecking(false); }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <CardTitle className="min-w-0">{t("learn.scoreOut", { score: result.score })}</CardTitle>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge tone={result.ai ? "brand" : "default"}>{result.ai ? t("learn.aiFeedback") : t("learn.ruleFeedback")}</Badge>
              <Badge tone="success">{result.saved ? t("learn.xpSavedShort", { xp: result.xpEarned }) : t("learn.xpPreviewShort", { xp: result.xpEarned })}</Badge>
            </div>
          </div>
          <div className="mt-2"><Progress value={result.score} label={t("learn.speakingScore")} /></div>
          <p className="mt-2 text-xs text-ink-500">{t("learn.wordsWpm", { w: result.wordCount, wpm: result.wpm, f: result.fillerCount })}</p>
          <div className="mt-3 space-y-1">
            {result.feedback.map((f, i) => <p key={i} className="text-sm text-ink-700">• {f}</p>)}
          </div>
        </Card>
        {result.strengths.length > 0 && (
          <Card><CardTitle>{t("learn.strengths")}</CardTitle>
            <ul className="mt-2 space-y-1">{result.strengths.map((s, i) => <li key={i} className="text-sm text-ink-700">✓ {s}</li>)}</ul>
          </Card>
        )}
        <Card>
          <CardTitle>{t("learn.fixes", { n: result.issues.length })}</CardTitle>
          {result.issues.length === 0 ? <CardDescription>{t("learn.noIssues")}</CardDescription> : (
            <ul className="mt-2 space-y-2">
              {result.issues.map((c, i) => (
                <li key={i} className="rounded-xl border border-ink-200 p-3 text-sm">
                  <Badge>{c.category}</Badge>
                  <p className="mt-1 font-medium text-ink-900">{c.message}</p>
                  {c.example && <p className="mt-1 text-ink-600">{c.example}</p>}
                </li>
              ))}
            </ul>
          )}
        </Card>
        {result.modelAnswer && (
          <Card>
            <CardTitle>{t("learn.modelAnswer")}</CardTitle>
            <p className="mt-2 text-sm leading-relaxed text-ink-800">{result.modelAnswer}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => speakText(result.modelAnswer)}>🔊 {t("learn.listen")}</Button>
              <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(result.modelAnswer)}>{t("learn.copyBtn")}</Button>
            </div>
          </Card>
        )}
        {result.recommendations.length > 0 && (
          <Card><CardTitle>{t("learn.nextSteps")}</CardTitle>
            <ul className="mt-2 space-y-1">{result.recommendations.map((r, i) => <li key={i} className="text-sm text-ink-700">→ {r}</li>)}</ul>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setResult(null); setManual(""); live.setTranscript(""); setSecs(0); }}>{t("learn.tryAgain")}</Button>
          <Button variant="ghost" onClick={onBack}>{t("learn.allTopics")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-medium text-brand-700 hover:underline">← {t("learn.allTopics")}</button>
      <Card>
        <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{topic.level}</Badge><Badge>{t("learn.targetSecs", { n: topic.targetSecs })}</Badge></div>
        <CardTitle className="mt-2">{topic.title}</CardTitle>
        <CardDescription>{topic.prompt}</CardDescription>
        <ul className="mt-2 space-y-1">{topic.questions.map((q, i) => <li key={i} className="text-sm text-ink-700">• {q}</li>)}</ul>
        <div className="mt-2 flex flex-wrap gap-2">{topic.usefulPhrases.map((p) => <Badge key={p}>{p}</Badge>)}</div>
      </Card>
      <Card>
        <CardTitle>{t("learn.stepSpeak")}</CardTitle>
        <CardDescription>{t("learn.speakDesc")}</CardDescription>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!active ? (
            <Button onClick={startAll}>{t("learn.startSpeaking", { time: formatSecs(topic.targetSecs) })}</Button>
          ) : (
            <Button variant="danger" onClick={stopAll}>{t("learn.stopRec", { time: formatSecs(secs) })}</Button>
          )}
          {rec.audioUrl && !active && (
            <audio controls src={rec.audioUrl} className="h-9 w-full max-w-xs" aria-label={t("learn.yourRecording")} />
          )}
        </div>
        {rec.error && <div className="mt-3"><Alert tone="warning" title={t("learn.micIssue")}>{rec.error}</Alert></div>}
        {!rec.supported && <div className="mt-3"><Alert tone="warning">{t("learn.recNotSupported")}</Alert></div>}
      </Card>
      <Card>
        <CardTitle>{t("learn.stepTranscript")}</CardTitle>
        <CardDescription>
          {live.supported ? t("learn.transcriptLive") : t("learn.transcriptManual")}
        </CardDescription>
        {live.listening && <p className="mt-2 text-sm font-medium text-brand-700" role="status">{t("learn.listeningNow")}</p>}
        {live.error && <div className="mt-2"><Alert tone="warning">{live.error}</Alert></div>}
        <label htmlFor="speak-transcript" className="sr-only">{t("learn.yourTranscript")}</label>
        <textarea id="speak-transcript" rows={6} value={live.transcript || manual}
          onChange={(e) => { live.setTranscript(e.target.value); setManual(e.target.value); }}
          placeholder={t("learn.saidHere")}
          className="mt-3 w-full rounded-xl border border-ink-200 bg-white p-3 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <p className="mt-1 text-xs text-ink-500" role="status">{t("learn.wordsStatus", { n: words, min: topic.minWords })}</p>
        {error && <div className="mt-3"><Alert tone="danger" title={t("learn.feedbackFailed")}>{error}</Alert></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={check} loading={checking} disabled={words < 10 || checking || active}>
            {active ? t("learn.stopFirst") : words < 10 ? t("learn.needWords", { n: words }) : t("learn.getFeedback")}
          </Button>
          <Button variant="ghost" size="sm" disabled={checking || active || !transcript} onClick={() => { setManual(""); live.setTranscript(""); }}>{t("common.clear")}</Button>
        </div>
      </Card>
    </div>
  );
}

export function TopicTalkExplorer({ initialTopics }: { initialTopics: TopicSummary[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<TopicSummary | null>(null);
  const [history, setHistory] = useState<{ attempts: Array<{ topic_slug: string; score: number; word_count: number; created_at: string }> } | null>(null);

  useEffect(() => {
    fetch("/api/speaking/history").then((r) => r.json()).then((j) => {
      if (j.attempts) setHistory(j);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialTopics.filter((t) => {
      if (level !== "all" && t.level !== level) return false;
      if (!needle) return true;
      return t.title.toLowerCase().includes(needle) || t.prompt.toLowerCase().includes(needle);
    });
  }, [initialTopics, level, query]);

  const bestByTopic = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of history?.attempts ?? []) {
      const prev = map.get(a.topic_slug) ?? 0;
      if (a.score > prev) map.set(a.topic_slug, a.score);
    }
    return map;
  }, [history]);

  if (active) return <TopicPractice topic={active} onBack={() => setActive(null)} />;

  return (
    <div>
      {history && history.attempts.length > 0 && (
        <Card className="mb-4">
          <CardTitle>{t("learn.recentAttempts")}</CardTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            {history.attempts.slice(0, 5).map((a, i) => <Badge key={i} tone="success">{a.topic_slug} · {a.score}</Badge>)}
          </div>
        </Card>
      )}
      <Card>
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <Input aria-label={t("learn.searchSpeaking")} placeholder={t("learn.searchSpeaking")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
            <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
              <option value="all">{t("learn.all")}</option>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: initialTopics.length })} {t("learn.topicsUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")} action={<Button size="sm" variant="secondary" onClick={() => { setQuery(""); setLevel("all"); }}>{t("learn.clearFilters")}</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((topic) => {
            const best = bestByTopic.get(topic.slug);
            return (
              <Card key={topic.slug} className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="brand">{topic.level}</Badge>
                  <Badge>{t("learn.minWordsPlus", { n: topic.minWords })}</Badge>
                  {best !== undefined && <Badge tone="success">{t("learn.bestScore", { n: best })}</Badge>}
                </div>
                <CardTitle className="mt-2">{topic.title}</CardTitle>
                <CardDescription>{topic.prompt}</CardDescription>
                <div className="mt-3"><Button size="sm" onClick={() => setActive(topic)}>{t("learn.startTalking")}</Button></div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================= READ ALOUD ================= */

interface ReadAloudResult {
  accuracy: number; wpm: number; matchedWords: number; passageWords: number;
  missedWords: string[]; extraCount: number; score: number; feedback: string[];
  hardWords: string[]; xpEarned: number; saved: boolean; ai: boolean;
}

function ReadAloudPractice({ passage, onBack }: { passage: PassageSummary; onBack: () => void }) {
  const { t } = useTranslation();
  const rec = useRecorder(t);
  const live = useLiveTranscript(t);
  const [manual, setManual] = useState("");
  const [secs, setSecs] = useState(0);
  const [checking, setChecking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [result, setResult] = useState<ReadAloudResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const transcript = (live.transcript || manual).trim();
  const words = countWords(transcript);
  const active = rec.recording || live.listening;

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); stopSpeaking(); }, []);

  function listen() {
    if (!hasTts()) { setError(t("learn.ttsUnsupported")); return; }
    setSpeaking(true);
    speakText(passage.text);
    window.setTimeout(() => setSpeaking(false), Math.min(60000, passage.text.length * 90));
  }

  function startAll() {
    setResult(null); setError(null); setSecs(0); stopSpeaking();
    void rec.start();
    if (hasRecognition()) live.start();
    timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
  }
  function stopAll() {
    rec.stop(); live.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setManual((m) => (live.transcript && !m ? live.transcript : m));
  }

  async function check() {
    setChecking(true); setError(null);
    try {
      const res = await fetch("/api/read-aloud/check", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ passageSlug: passage.slug, transcript, durationSecs: secs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("learn.checkFailedDesc"));
      setResult(json);
    } catch (e) { setError(e instanceof Error ? e.message : t("learn.couldNotCheck")); }
    finally { setChecking(false); }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <Card>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <CardTitle className="min-w-0">{t("learn.accuracyScore", { a: result.accuracy, s: result.score })}</CardTitle>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge tone={result.ai ? "brand" : "default"}>{result.ai ? t("learn.aiFeedback") : t("learn.ruleFeedback")}</Badge>
              <Badge tone="success">{result.saved ? t("learn.xpSavedShort", { xp: result.xpEarned }) : t("learn.xpPreviewShort", { xp: result.xpEarned })}</Badge>
            </div>
          </div>
          <div className="mt-2"><Progress value={result.accuracy} label={t("learn.pronAccuracy")} /></div>
          <p className="mt-2 text-xs text-ink-500">{t("learn.matchedWords", { a: result.matchedWords, b: result.passageWords, w: result.wpm })}</p>
          <div className="mt-3 space-y-1">
            {result.feedback.map((f, i) => <p key={i} className="text-sm text-ink-700">• {f}</p>)}
          </div>
        </Card>
        {result.missedWords.length > 0 && (
          <Card>
            <CardTitle>{t("learn.missedWords")}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.missedWords.map((w) => <Badge key={w} tone="warning">{w}</Badge>)}
            </div>
            <div className="mt-3">
              <Button size="sm" variant="secondary" onClick={() => speakText(result.missedWords.join(". "))}>{t("learn.hearMissed")}</Button>
            </div>
          </Card>
        )}
        {result.hardWords.length > 0 && (
          <Card><CardTitle>{t("learn.watchOut")}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">{result.hardWords.map((w) => <Badge key={w}>{w}</Badge>)}</div>
          </Card>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => { setResult(null); setManual(""); live.setTranscript(""); setSecs(0); }}>{t("learn.readAgain")}</Button>
          <Button variant="ghost" onClick={onBack}>{t("learn.allPassages")}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm font-medium text-brand-700 hover:underline">← {t("learn.allPassages")}</button>
      <Card>
        <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{passage.level}</Badge><Badge>{passage.focus}</Badge></div>
        <CardTitle className="mt-2">{passage.title}</CardTitle>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-800">{passage.text}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={listen} disabled={speaking || active}>
            {speaking ? t("learn.playing") : t("learn.listenFirst")}
          </Button>
          <Button size="sm" variant="ghost" onClick={stopSpeaking}>{t("learn.stopAudio")}</Button>
        </div>
        {!hasTts() && typeof window !== "undefined" && (
          <p className="mt-2 text-xs text-ink-500">{t("learn.ttsUnavailable")}</p>
        )}
      </Card>
      <Card>
        <CardTitle>{t("learn.nowRead")}</CardTitle>
        <CardDescription>{t("learn.nowReadDesc")}</CardDescription>
        <div className="mt-3 flex flex-wrap gap-2">
          {!active ? <Button onClick={startAll}>{t("learn.startReading")}</Button>
            : <Button variant="danger" onClick={stopAll}>{t("learn.stopRec", { time: formatSecs(secs) })}</Button>}
          {rec.audioUrl && !active && <audio controls src={rec.audioUrl} className="h-9 w-full max-w-xs" aria-label={t("learn.yourReading")} />}
        </div>
        {rec.error && <div className="mt-3"><Alert tone="warning" title={t("learn.micIssue")}>{rec.error}</Alert></div>}
        <label htmlFor="readaloud-transcript" className="mb-1.5 mt-4 block text-sm font-medium text-ink-700">{t("learn.whatHeard")}</label>
        <textarea id="readaloud-transcript" rows={4} value={live.transcript || manual}
          onChange={(e) => { live.setTranscript(e.target.value); setManual(e.target.value); }}
          placeholder={t("learn.heardHere")}
          className="w-full rounded-xl border border-ink-200 bg-white p-3 text-sm leading-relaxed text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
        <p className="mt-1 text-xs text-ink-500" role="status">{t("learn.wordsHeard", { n: words })}</p>
        {error && <div className="mt-3"><Alert tone="danger" title={t("learn.checkFailed")}>{error}</Alert></div>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={check} loading={checking} disabled={words < 3 || checking || active}>
            {active ? t("learn.stopFirst") : t("learn.checkPron")}
          </Button>
          <Button variant="ghost" size="sm" disabled={checking || active || !transcript} onClick={() => { setManual(""); live.setTranscript(""); }}>{t("common.clear")}</Button>
        </div>
      </Card>
    </div>
  );
}

export function ReadAloudExplorer({ initialPassages }: { initialPassages: PassageSummary[] }) {
  const { t } = useTranslation();
  const [level, setLevel] = useState("all");
  const [active, setActive] = useState<PassageSummary | null>(null);

  const filtered = useMemo(
    () => initialPassages.filter((p) => level === "all" || p.level === level),
    [initialPassages, level]
  );

  if (active) return <ReadAloudPractice passage={active} onBack={() => setActive(null)} />;

  return (
    <div>
      <Card>
        <label className="flex min-w-0 max-w-xs items-center gap-2 text-sm">
          <span className="shrink-0 text-ink-500">{t("learn.level")}</span>
          <select aria-label={t("learn.level")} value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-2 text-sm">
            <option value="all">{t("learn.all")}</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <p className="mt-2 text-xs text-ink-500" role="status">{t("learn.resultsOf", { shown: filtered.length, total: initialPassages.length })} {t("learn.passagesUnit")}</p>
      </Card>
      {filtered.length === 0 ? (
        <div className="mt-4"><EmptyState title={t("learn.noResults")} description={t("learn.tryDifferent")} action={<Button size="sm" variant="secondary" onClick={() => setLevel("all")}>{t("learn.clearFilter")}</Button>} /></div>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {filtered.map((p) => (
            <Card key={p.slug} className="flex min-w-0 flex-col">
              <div className="flex flex-wrap items-center gap-2"><Badge tone="brand">{p.level}</Badge><Badge>{t("modules.wordsCount", { count: p.text.trim().split(/\s+/).length })}</Badge></div>
              <CardTitle className="mt-2">{p.title}</CardTitle>
              <CardDescription>{p.focus}</CardDescription>
              <p className="mt-2 line-clamp-3 text-sm text-ink-600">{p.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setActive(p)}>{t("learn.readAloudVerb")}</Button>
                <Button size="sm" variant="secondary" onClick={() => speakText(p.text)}>🔊 {t("learn.listen")}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= PAGE TABS ================= */

export function SpeakingTabs({ topics, passages }: { topics: TopicSummary[]; passages: PassageSummary[] }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"talk" | "read">("talk");
  return (
    <div>
      <div role="tablist" aria-label={t("learn.speakingModes")} className="flex gap-1 rounded-xl border border-ink-200 bg-white p-1">
        {(["talk", "read"] as const).map((mode) => (
          <button key={mode} role="tab" aria-selected={tab === mode} onClick={() => { setTab(mode); stopSpeaking(); }}
            className={`min-w-0 flex-1 truncate rounded-lg px-4 py-2 text-sm font-medium transition-colors ${tab === mode ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-100"}`}>
            {mode === "talk" ? t("learn.topicTalk") : t("learn.readAloud")}
          </button>
        ))}
      </div>
      <div className="mt-4" role="tabpanel">
        {tab === "talk" ? <TopicTalkExplorer initialTopics={topics} /> : <ReadAloudExplorer initialPassages={passages} />}
      </div>
    </div>
  );
}
