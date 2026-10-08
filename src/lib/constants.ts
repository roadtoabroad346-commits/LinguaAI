export const APP_NAME = "LinguaAI";
export const APP_DESCRIPTION = "Personalized AI-powered English learning for A1–C1 students.";
export const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;
export type Level = (typeof LEVELS)[number];
/** Navigation items reference i18n keys (`nav.*`) — labels are never hardcoded. */
export const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: "LayoutDashboard" },
  { href: "/daily-challenge", key: "nav.dailyChallenge", icon: "Flame" },
  { href: "/guided-path", key: "nav.guidedPath", icon: "Route" },
  { href: "/smart-path", key: "nav.smartPath", icon: "Compass" },
  { href: "/vocabulary", key: "nav.vocabulary", icon: "BookOpen" },
  { href: "/dictionary", key: "nav.dictionary", icon: "BookMarked" },
  { href: "/flashcards", key: "nav.flashcards", icon: "Layers" },
  { href: "/grammar", key: "nav.grammar", icon: "PenLine" },
  { href: "/reading", key: "nav.reading", icon: "BookText" },
  { href: "/listening", key: "nav.listening", icon: "Headphones" },
  { href: "/pronunciation", key: "nav.pronunciation", icon: "AudioLines" },
  { href: "/speaking", key: "nav.speaking", icon: "Mic" },
  { href: "/writing", key: "nav.writing", icon: "NotebookPen" },
  { href: "/spelling", key: "nav.spelling", icon: "SpellCheck" },
  { href: "/progress", key: "nav.progress", icon: "Trophy" },
  { href: "/ai-teacher", key: "nav.aiTeacher", icon: "Sparkles" }
] as const;
