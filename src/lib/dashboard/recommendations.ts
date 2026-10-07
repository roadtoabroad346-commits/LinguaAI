/** Phase 2 — deterministic recommendations (rule-based; Gemini optional in Phase 5+). */
import type { LearningMode, Level, ProfileRow } from "@/types/database";

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  href: string;
  reason: string;
  xp: number;
}

export interface RecommendationInput {
  profile: Pick<ProfileRow, "level" | "learning_mode" | "onboarding_completed" | "goals"> | null;
  xpToday: number;
  dailyGoalXp: number;
  streak: number;
  challengeDone: boolean;
  dictionaryCount: number;
}

const MODULE_BY_GOAL: Array<{ match: RegExp; title: string; description: string; href: string; xp: number }> = [
  { match: /speak|talk|conversation/i, title: "Speaking: introduce yourself", description: "2-minute Topic Talk to build fluency.", href: "/speaking", xp: 20 },
  { match: /writ|essay|email/i, title: "Writing: short paragraph", description: "Write 80–120 words and get instant feedback.", href: "/writing", xp: 25 },
  { match: /listen/i, title: "Listening: daily dialogue", description: "A 2-minute dialogue with transcript mode.", href: "/listening", xp: 15 },
  { match: /read/i, title: "Reading: level article", description: "Read a short article + 3 comprehension questions.", href: "/reading", xp: 15 },
  { match: /grammar|exam|test/i, title: "Grammar: tense review", description: "A focused 10-question tense workout.", href: "/grammar", xp: 15 },
  { match: /vocab|word/i, title: "Vocabulary: 10 new words", description: "Learn 10 words and save them to your dictionary.", href: "/vocabulary", xp: 10 },
];

export function buildRecommendations(input: RecommendationInput): Recommendation[] {
  const recs: Recommendation[] = [];
  const level: Level | null = input.profile?.level ?? null;
  const mode: LearningMode | null = input.profile?.learning_mode ?? null;

  if (!input.profile?.onboarding_completed) {
    recs.push({ id: "onboarding", title: "Finish onboarding", description: "Tell us your goals so we can personalize your path.", href: "/onboarding", reason: "Setup incomplete", xp: 10 });
  }
  if (!level) {
    recs.push({ id: "placement", title: "Take the placement test", description: "5 minutes to find your A1–C1 level.", href: "/placement", reason: "Level unknown", xp: 20 });
  }
  if (!input.challengeDone) {
    recs.push({ id: "challenge", title: "Today's Daily Challenge", description: "5 quick questions · earn up to 60 XP.", href: "/daily-challenge", reason: input.streak > 0 ? `${input.streak}-day streak — keep it alive` : "Start your streak today", xp: 60 });
  }
  if (input.dictionaryCount === 0) {
    recs.push({ id: "vocab-start", title: "Learn your first 10 words", description: "Build your personal dictionary from day one.", href: "/vocabulary", reason: "Dictionary is empty", xp: 10 });
  }

  // Goal-aware picks (max 1–2).
  const goals = input.profile?.goals ?? [];
  for (const g of goals) {
    const m = MODULE_BY_GOAL.find((c) => c.match.test(g));
    if (m && !recs.some((r) => r.href === m.href)) {
      recs.push({ id: `goal-${m.href}`, title: m.title, description: m.description, href: m.href, reason: `Matches your goal: “${g}”`, xp: m.xp });
    }
    if (recs.length >= 5) break;
  }

  // Level-aware filler so the list is never empty.
  const fillers: Recommendation[] =
    !level || level === "A1" || level === "A2"
      ? [
          { id: "f-vocab", title: "Vocabulary: everyday words", description: "Short sets with audio and flashcards.", href: "/vocabulary", reason: `Picked for ${level ?? "starter"} level`, xp: 10 },
          { id: "f-listening", title: "Listening: slow dialogues", description: "Clear audio with transcript mode.", href: "/listening", reason: "Builds confidence early", xp: 15 },
        ]
      : level === "B1" || level === "B2"
        ? [
            { id: "f-reading", title: "Reading: B-level article", description: "Comprehension + vocabulary in context.", href: "/reading", reason: `Picked for ${level} level`, xp: 15 },
            { id: "f-grammar", title: "Grammar: mixed tenses", description: "Fix the mistakes that cost you points.", href: "/grammar", reason: `Picked for ${level} level`, xp: 15 },
          ]
        : [
            { id: "f-writing", title: "Writing: opinion paragraph", description: "Advanced linking words + feedback.", href: "/writing", reason: "Picked for C1 level", xp: 25 },
            { id: "f-speaking", title: "Speaking: debate topic", description: "Defend an opinion for 2 minutes.", href: "/speaking", reason: "Fluency at C1", xp: 20 },
          ];
  for (const f of fillers) {
    if (recs.length >= 4) break;
    if (!recs.some((r) => r.href === f.href)) recs.push(f);
  }

  // Guided-path nudge vs free-learning freedom.
  if (mode === "guided" && !recs.some((r) => r.href === "/guided-path")) {
    recs.push({ id: "guided", title: "Continue your Guided Path", description: "Your next step is already queued up.", href: "/guided-path", reason: "Guided Path mode", xp: 15 });
  }

  return recs.slice(0, 4);
}
