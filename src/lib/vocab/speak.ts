/** Client-safe speech helper. Uses Web Speech API; no-op when unavailable (server/SSR). */
import { getPlaybackSpeed, type PlaybackSpeed } from "@/lib/audio/speed";

export interface SpeakOptions {
  lang?: string;
  /** SpeechSynthesis rate multiplier. Defaults to the learner's saved listening speed. */
  rate?: PlaybackSpeed | number;
}

export function speak(text: string, langOrOpts: string | SpeakOptions = "en-US"): void {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const opts: SpeakOptions = typeof langOrOpts === "string" ? { lang: langOrOpts } : langOrOpts;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = opts.lang ?? "en-US";
    const rate = opts.rate ?? getPlaybackSpeed();
    utter.rate = Number.isFinite(rate) ? Math.min(2, Math.max(0.4, Number(rate))) : 0.9;
    window.speechSynthesis.speak(utter);
  } catch {
    // Audio is best-effort; never break the UI.
  }
}

/** Stop any in-flight utterance (pause/replay controls). */
export function stopSpeaking(): void {
  try {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // No-op.
  }
}

/** True when the browser can speak (used for graceful empty states). */
export function canSpeak(): boolean {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  } catch {
    return false;
  }
}
