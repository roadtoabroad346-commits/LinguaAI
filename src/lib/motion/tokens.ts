// Central motion tokens — easing, springs, durations, variants.
// Honor prefers-reduced-motion via helpers in hooks.ts.

import type { Variants } from "framer-motion";

export const EASE = {
  out: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
  springy: [0.34, 1.56, 0.64, 1] as const,
  swift: [0.16, 1, 0.3, 1] as const,
} as const;

export const DURATION = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  slow: 0.55,
  slower: 0.8,
} as const;

export const SPRING = {
  soft: { type: "spring", stiffness: 260, damping: 26 },
  snappy: { type: "spring", stiffness: 420, damping: 32 },
  bouncy: { type: "spring", stiffness: 320, damping: 18 },
  stiff: { type: "spring", stiffness: 500, damping: 40 },
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, y: 12, transition: { duration: DURATION.fast } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: DURATION.base, ease: EASE.out } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: DURATION.fast } },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE.out } },
};

export const slideSheet: Variants = {
  hidden: { y: "100%", opacity: 0.6 },
  show: { y: "0%", opacity: 1, transition: { type: "spring", stiffness: 320, damping: 32 } },
  exit: { y: "100%", opacity: 0, transition: { duration: 0.24, ease: EASE.inOut } },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE.out } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 26 } },
};
