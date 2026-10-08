"use client";

import * as React from "react";
import { motion, useReducedMotion as useFMMotion } from "framer-motion";
import { DURATION, EASE, fadeUp, pageTransition, popIn, scaleIn, staggerChild, staggerParent } from "./tokens";
import { useCountUp } from "./hooks";
import { cn } from "@/lib/utils";

/**
 * Bulletproof in-view-once hook.
 * - SSR / no-JS / no-IntersectionObserver → visible (inView starts true on server,
 *   flips to false after mount only when IO exists and element is below the fold).
 * - If IO never fires for an element already near the viewport (broken observer,
 *   aggressive blockers, framer quirks) a fallback timer forces it visible.
 * Content is NEVER stuck at opacity 0.
 */
function useInViewOnce<T extends HTMLElement>(threshold = 0.12) {
  const ref = React.useRef<T | null>(null);
  const [inView, setInView] = React.useState(true);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    const belowFold = rect.top > window.innerHeight * 0.92;
    if (belowFold) setInView(false);
    else {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    // Safety net: if the element is near/inside the viewport but IO stayed
    // silent, force-show so nothing is ever left invisible.
    const fallback = window.setTimeout(() => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 1.1 && r.bottom > -160) setInView(true);
    }, 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [threshold]);

  return { ref, inView };
}

/** Page-level fade/slide wrapper — use once per route. */
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={pageTransition} initial="hidden" animate="show" exit="exit">
      {children}
    </motion.div>
  );
}

/**
 * Scroll-triggered reveal (once). SSR-safe: renders visible, animates in only
 * when the observer confirms entry. Falls back to plain div with reduced motion.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 22,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useFMMotion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: DURATION.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>(0.06);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerParent}
      initial={false}
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerChild} initial={false}>
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={fadeUp} initial="hidden" animate="show" transition={{ delay }}>
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={scaleIn} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function PopIn({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={popIn} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

/** Animated integer counter. Starts only when visible (no wasted offscreen work). */
export function AnimatedNumber({
  value,
  className,
  duration = 900,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [started, setStarted] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStarted(true);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      setStarted(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setStarted(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    // Safety net: never leave the counter at 0 if the observer stays silent.
    const fallback = window.setTimeout(() => setStarted(true), 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);
  const v = useCountUp(value, { duration, enabled: started });
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {v.toLocaleString()}
    </span>
  );
}
