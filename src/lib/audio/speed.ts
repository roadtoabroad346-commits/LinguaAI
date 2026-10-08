/**
 * Shared playback-speed model for all listening/pronunciation audio.
 * Speeds are real SpeechSynthesis `rate` multipliers; the selected value
 * persists in localStorage so it survives refresh across the whole app.
 */

export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

export const DEFAULT_PLAYBACK_SPEED: PlaybackSpeed = 1;
export const PLAYBACK_SPEED_KEY = "linguaai_playback_speed";

/** Slow reference speed used for "slow audio" buttons (pronunciation, flashcards). */
export const SLOW_PLAYBACK_SPEED = 0.6;

export function clampSpeed(value: unknown): PlaybackSpeed {
  const n = typeof value === "string" ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return DEFAULT_PLAYBACK_SPEED;
  let best: PlaybackSpeed = PLAYBACK_SPEEDS[0];
  let bestDist = Math.abs(n - best);
  for (const s of PLAYBACK_SPEEDS) {
    const d = Math.abs(n - s);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/** Read the persisted speed. Safe on the server (returns the default). */
export function getPlaybackSpeed(): PlaybackSpeed {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) {
      return DEFAULT_PLAYBACK_SPEED;
    }
    return clampSpeed(window.localStorage.getItem(PLAYBACK_SPEED_KEY));
  } catch {
    return DEFAULT_PLAYBACK_SPEED;
  }
}

/** Persist the speed and notify other components on the page. */
export function setPlaybackSpeed(speed: PlaybackSpeed): void {
  try {
    if (typeof window === "undefined" || !("localStorage" in window)) return;
    window.localStorage.setItem(PLAYBACK_SPEED_KEY, String(speed));
    window.dispatchEvent(new CustomEvent("linguaai:speed", { detail: speed }));
  } catch {
    // Persistence is best-effort; playback still works for this session.
  }
}

export function formatSpeed(speed: number): string {
  return `${speed}×`.replace(".5", ".5");
}
