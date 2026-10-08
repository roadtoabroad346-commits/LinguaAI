"use client";

import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import {
  PLAYBACK_SPEEDS,
  formatSpeed,
  getPlaybackSpeed,
  setPlaybackSpeed,
  type PlaybackSpeed,
} from "@/lib/audio/speed";
import { stopSpeaking } from "@/lib/vocab/speak";
import { cn } from "@/lib/utils";

/**
 * Real playback-speed control (0.5×–2×) shared by listening,
 * flashcards, vocabulary and pronunciation. The selected speed
 * persists in localStorage and applies to every `speak()` call.
 */
export function SpeedMenu({ compact = false }: { compact?: boolean }) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(DEFAULT);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setSpeed(getPlaybackSpeed());
    const onChange = (e: Event) => {
      const v = (e as CustomEvent).detail;
      if (typeof v === "number") setSpeed(v as PlaybackSpeed);
    };
    window.addEventListener("linguaai:speed", onChange);
    return () => window.removeEventListener("linguaai:speed", onChange);
  }, []);

  function pick(next: PlaybackSpeed) {
    stopSpeaking();
    setPlaybackSpeed(next);
    setSpeed(next);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Playback speed, currently ${formatSpeed(speed)}. Activate to change.`}
        title={`Playback speed: ${formatSpeed(speed)}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-ink-200 bg-white font-semibold text-ink-700 hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800",
          compact ? "px-2.5 py-2 text-xs" : "px-3 py-2 text-sm"
        )}
      >
        <Gauge className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        <span className="tabular-nums">{formatSpeed(speed)}</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close speed menu"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            aria-label="Playback speed"
            className="absolute right-0 z-40 mt-2 w-36 overflow-hidden rounded-2xl border border-ink-200 bg-white p-1.5 shadow-sheet dark:border-ink-700 dark:bg-ink-900"
          >
            {PLAYBACK_SPEEDS.map((s) => (
              <li key={s} role="option" aria-selected={s === speed}>
                <button
                  type="button"
                  onClick={() => pick(s)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold tabular-nums",
                    s === speed
                      ? "bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                      : "text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  )}
                >
                  {formatSpeed(s)}
                  {s === 1 && (
                    <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">normal</span>
                  )}
                  {s === speed && <span aria-hidden>✓</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const DEFAULT = 1 as PlaybackSpeed;
