"use client";

import * as React from "react";
import { motion, useReducedMotion as useFMMotion } from "framer-motion";
import { DURATION, EASE, fadeUp, pageTransition, popIn, scaleIn, staggerChild, staggerParent } from "./tokens";
import { useCountUp } from "./hooks";
import { cn } from "@/lib/utils";

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

/** Scroll-triggered reveal (once). Falls back to plain div with reduced motion. */
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
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={{ duration: DURATION.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useFMMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerChild}>
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

/** Animated integer counter. */
export function AnimatedNumber({
  value,
  className,
  duration = 900,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const v = useCountUp(value, { duration });
  return <span className={cn("tabular-nums", className)}>{v.toLocaleString()}</span>;
}
