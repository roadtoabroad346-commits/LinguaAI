"use client";

import * as React from "react";

/** True when the OS asks for reduced motion (reactive). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  // Also respect the manual LinguaAI setting.
  React.useEffect(() => {
    try {
      if (localStorage.getItem("linguaai_reduced_motion") === "1") setReduced(true);
    } catch {
      /* noop */
    }
  }, []);
  return reduced;
}

/** Animated number counter (XP, streak, scores). Respects reduced motion. */
export function useCountUp(target: number, opts?: { duration?: number; enabled?: boolean }) {
  const duration = opts?.duration ?? 900;
  const enabled = opts?.enabled ?? true;
  const [value, setValue] = React.useState(0);
  const reducedRef = React.useRef(false);
  React.useEffect(() => {
    reducedRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    try {
      if (localStorage.getItem("linguaai_reduced_motion") === "1") reducedRef.current = true;
    } catch {
      /* noop */
    }
  }, []);

  React.useEffect(() => {
    if (!enabled) return;
    if (reducedRef.current) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, enabled]);

  return value;
}

/** Optional haptic tap — vibrates only when enabled in settings + supported. */
export function haptic(pattern: number | number[] = 8) {
  try {
    if (localStorage.getItem("linguaai_haptics") === "0") return;
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      (navigator as Navigator & { vibrate: (p: number | number[]) => boolean }).vibrate(pattern);
    }
  } catch {
    /* noop */
  }
}

export function useHaptic() {
  return React.useCallback((p?: number | number[]) => haptic(p ?? 8), []);
}
