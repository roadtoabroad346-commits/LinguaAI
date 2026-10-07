"use client";
import { useRef, useState } from "react";
import { Card, CardDescription } from "@/components/ui/Card";
import { Alert, Badge, EmptyState } from "@/components/ui/feedback";
import { Button } from "@/components/ui/Button";
import { QUICK_PROMPTS } from "@/lib/teacher/teacher";
import { useTranslation } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string; ai?: boolean }

export function TeacherChat() {
  const { t, locale } = useTranslation();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedAi, setUsedAi] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: content.slice(0, 2000) }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai-teacher/chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          interfaceLanguage: locale,
          learningLanguage: "en",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("teacher.unavailable"));
      setUsedAi(Boolean(json.ai));
      setMessages([...next, { role: "assistant", content: String(json.reply), ai: Boolean(json.ai) }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("teacher.couldNotReach"));
      setMessages(next);
    } finally {
      setSending(false);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ block: "end" }));
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{t("teacher.askAnything")}</p>
          {usedAi !== null && <Badge tone={usedAi ? "brand" : "default"}>{usedAi ? t("teacher.gemini") : t("teacher.offline")}</Badge>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_PROMPTS.slice(0, 4).map((q) => (
            <button key={q} type="button" onClick={() => send(q)} disabled={sending}
              className="min-w-0 max-w-full truncate rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50">{q}</button>
          ))}
        </div>
      </Card>

      {messages.length === 0 ? (
        <EmptyState title={t("teacher.startConversation")} description={t("teacher.startConversationDesc")} />
      ) : (
        <div className="space-y-3" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-brand-600 text-white" : "border border-ink-200 bg-white text-ink-800")}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              </div>
            </div>
          ))}
          {sending && <p className="text-xs text-ink-500" role="status">{t("teacher.thinking")}</p>}
          <div ref={bottomRef} />
        </div>
      )}

      {error && <Alert tone="danger" title={t("teacher.sendFailed")}>{error}</Alert>}

      <Card>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <label htmlFor="teacher-input" className="sr-only">{t("teacher.messageLabel")}</label>
          <input id="teacher-input" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000}
            placeholder={t("teacher.messagePlaceholder")} disabled={sending}
            className="h-11 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-ink-50" />
          <Button type="submit" loading={sending} disabled={!input.trim() || sending}>{t("common.send")}</Button>
        </form>
        <CardDescription>{t("teacher.historyHint")} <Button variant="ghost" size="sm" className="ml-1 h-auto px-1 py-0 text-xs" onClick={() => { setMessages([]); setUsedAi(null); setError(null); }}>{t("teacher.clearChat")}</Button></CardDescription>
      </Card>
    </div>
  );
}
