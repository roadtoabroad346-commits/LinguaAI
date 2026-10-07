"use client";

import confetti from "canvas-confetti";
import { haptic } from "./hooks";

let lastBurst = 0;

/** Celebratory burst for lesson complete / perfect score / streak milestones. */
export function celebrate(opts?: { big?: boolean; force?: boolean }) {
  const now = Date.now();
  if (!opts?.force && now - lastBurst < 900) return;
  lastBurst = now;
  haptic([12, 40, 12]);
  try {
    if (localStorage.getItem("linguaai_reduced_motion") === "1") return;
  } catch {
    /* noop */
  }
  const defaults = {
    origin: { y: 0.72 },
    disableForReducedMotion: true,
  } as const;
  if (opts?.big) {
    confetti({ ...defaults, particleCount: 120, spread: 80, colors: ["#4f46e5", "#7c3aed", "#f59e0b", "#10b981", "#ffffff"] });
    window.setTimeout(() => {
      confetti({ ...defaults, particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
      confetti({ ...defaults, particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
    }, 180);
  } else {
    confetti({ ...defaults, particleCount: 55, spread: 65, colors: ["#4f46e5", "#7c3aed", "#f59e0b", "#10b981"] });
  }
}
