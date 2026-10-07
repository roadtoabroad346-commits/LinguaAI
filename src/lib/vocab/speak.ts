/** Client-safe speech helper. Uses Web Speech API; no-op when unavailable (server/SSR). */
export function speak(text: string, lang = "en-US"): void {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  } catch {
    // Audio is best-effort; never break the UI.
  }
}
