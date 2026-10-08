/** Phase 8 — Smart Path adaptive engine. Pure + deterministic (zero Gemini tokens). */

import type { LearningMode, Level } from "@/types/database";
import { GRAMMAR_TOPICS } from "@/lib/grammar/topics";
import { READING_PASSAGES } from "@/lib/reading/library";
import { LISTENING_TRACKS } from "@/lib/listening/library";
import { PRONUNCIATION_DRILLS } from "@/lib/pronunciation/drills";
import { VOCAB_BANK } from "@/lib/vocab/bank";
import { SKILL_META, type SkillScore, type WeakArea } from "@/lib/gamification/gamification";

export const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1"];

export const MAX_STEPS = 5;
export const MAX_MINUTES = 45;

/** One rung easier — remediation content when accuracy is very low. */
export function stepDown(level: Level): Level {
  const i = LEVEL_ORDER.indexOf(level);
  return LEVEL_ORDER[Math.max(0, i - 1)];
}

export type SmartStepKind = "review" | "challenge" | "weak-skill" | "mistakes" | "productive" | "new" | "goal";

export interface SmartStep {
  id: string;
  kind: SmartStepKind;
  skill: string;
  title: string;
  description: string;
  href: string;
  reason: string;
  xpEstimate: number;
  minutes: number;
  level: Level | null;
}

export interface DueWordLike {
  word: string;
  mastery: number;
  nextReviewAt: string | null;
}

export interface SlugStat {
  skill: string;
  slug: string;
  title: string;
  /** 0–100 accuracy across attempts on this slug. */
  accuracyPct: number;
  attempts: number;
}

export interface WritingErrorCount {
  category: string;
  count: number;
}

export interface MissedWord {
  word: string;
  misses: number;
}

export interface SmartPathInput {
  level: Level | null;
  learningMode: LearningMode | null;
  goals: string[];
  todayKey: string;
  skills: SkillScore[];
  weakAreas: WeakArea[];
  /** Words due for spaced-repetition review (already filtered to due). */
  dueWords: DueWordLike[];
  totalWords: number;
  avgMastery: number | null;
  /** Per-slug accuracy, worst first. */
  worstSlugs: SlugStat[];
  writingErrors: WritingErrorCount[];
  misspelledWords: MissedWord[];
  /** Module kinds active in the last 7 days (e.g. "grammar", "writing"). */
  recentKinds: string[];
  /** Content slugs attempted in the last 7 days — avoid immediate repeats. */
  recentSlugs: string[];
  challengeDone: boolean;
  xpToday: number;
  dailyGoalXp: number;
  streak: number;
  /** Days since last productive attempt (null = never). */
  writingDaysAgo: number | null;
  speakingDaysAgo: number | null;
}

export interface SmartPathPlan {
  steps: SmartStep[];
  meta: {
    totalMinutes: number;
    totalXp: number;
    focusSkills: string[];
    level: Level | null;
    todayKey: string;
  };
}

interface Levelled {
  slug: string;
  level: Level;
  title: string;
}

const GRAMMAR_LEVELLED: Levelled[] = GRAMMAR_TOPICS.map((t) => ({ slug: t.slug, level: t.level, title: t.title }));
const READING_LEVELLED: Levelled[] = READING_PASSAGES.map((p) => ({ slug: p.slug, level: p.level, title: p.title }));
const LISTENING_LEVELLED: Levelled[] = LISTENING_TRACKS.map((t) => ({ slug: t.slug, level: t.level, title: t.title }));
const PRON_LEVELLED: Levelled[] = PRONUNCIATION_DRILLS.map((t) => ({ slug: t.slug, level: t.level, title: t.title }));

const KIND_HREF: Record<string, string> = {
  grammar: "/grammar",
  reading: "/reading",
  listening: "/listening",
  dictation: "/listening",
  vocabulary: "/vocabulary/practice",
  spelling: "/spelling",
  writing: "/writing",
  speaking: "/speaking",
  "read-aloud": "/speaking",
};

/** Pick deterministic remedial/at-level content, preferring unattempted slugs. */
export function pickContent(
  pool: Levelled[],
  level: Level | null,
  recentSlugs: string[],
  easeDown: boolean
): (Levelled & { remedial: boolean }) | null {
  if (pool.length === 0) return null;
  const target = level ?? "A1";
  const remedialLevel = easeDown ? stepDown(target) : target;
  const bySlug = (a: Levelled, b: Levelled): number => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  const fresh = (items: Levelled[]): Levelled | null => {
    const sorted = [...items].sort(bySlug);
    return sorted.find((i) => !recentSlugs.includes(i.slug)) ?? sorted[0] ?? null;
  };
  const atRemedial = fresh(pool.filter((i) => i.level === remedialLevel));
  if (atRemedial) return { ...atRemedial, remedial: easeDown && remedialLevel !== target };
  const atTarget = fresh(pool.filter((i) => i.level === target));
  if (atTarget) return { ...atTarget, remedial: false };
  // Nearest level fallback (deterministic: closest level, then slug order).
  const sorted = [...pool].sort((a, b) => {
    const da = Math.abs(LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(target));
    const db = Math.abs(LEVEL_ORDER.indexOf(b.level) - LEVEL_ORDER.indexOf(target));
    return da - db || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
  });
  const pick = sorted.find((i) => !recentSlugs.includes(i.slug)) ?? sorted[0] ?? null;
  return pick ? { ...pick, remedial: false } : null;
}

function skillLabel(skill: string): string {
  return SKILL_META[skill]?.label ?? skill;
}

function skillHref(skill: string): string {
  return SKILL_META[skill]?.href ?? "/dashboard";
}

/** Build the ordered "today" plan from learner signals. Always returns ≥1 step. */
export function buildSmartPath(input: SmartPathInput): SmartPathPlan {
  const level = input.level;
  const steps: SmartStep[] = [];
  const usedHrefs = new Set<string>();
  const usedSlugs = new Set<string>();

  function push(step: SmartStep): void {
    if (steps.length >= MAX_STEPS) return;
    if (usedHrefs.has(step.href)) return;
    usedHrefs.add(step.href);
    steps.push(step);
  }

  // 1 — Spaced-repetition review comes first (review schedule drives retention).
  const dueCount = input.dueWords.length;
  if (dueCount > 0) {
    push({
      id: "review-due",
      kind: "review",
      skill: "vocabulary",
      title: `Review ${dueCount} due word${dueCount === 1 ? "" : "s"}`,
      description: "Flashcards first — spaced repetition protects what you already learned.",
      href: "/flashcards",
      reason: `${dueCount} word${dueCount === 1 ? " is" : "s are"} due for review${input.totalWords > 0 ? ` of ${input.totalWords} saved` : ""}`,
      xpEstimate: Math.min(30, dueCount * 3),
      minutes: Math.max(5, Math.min(15, Math.ceil(dueCount / 2))),
      level,
    });
  }

  // 2 — Daily Challenge keeps streak + XP on track (unless already done).
  if (!input.challengeDone) {
    push({
      id: "daily-challenge",
      kind: "challenge",
      skill: "challenge",
      title: "Today's Daily Challenge",
      description: "5 quick questions across skills · up to 60 XP.",
      href: "/daily-challenge",
      reason: input.streak > 0 ? `${input.streak}-day streak — keep it alive` : "Fastest way to start your streak today",
      xpEstimate: 40,
      minutes: 10,
      level,
    });
  }

  // 3 — Weakest skill gets a targeted step (accuracy < 70, or unstarted).
  const weak = input.weakAreas[0] ?? null;
  if (weak) {
    const score = input.skills.find((s) => s.skill === weak.skill) ?? null;
    const acc = score?.accuracyPct ?? null;
    const remedial = acc !== null && acc < 40;
    const step = weakSkillStep(weak.skill, acc, level, input, remedial);
    if (step) {
      for (const s of step.used ?? []) usedSlugs.add(s);
      push(step.step);
    }
  }

  // 4 — Concrete mistakes: worst slug, writing error pattern, or misspelled word.
  if (steps.length < MAX_STEPS) {
    const mistake = mistakeStep(input, usedHrefs, usedSlugs);
    if (mistake) {
      for (const s of mistake.used ?? []) usedSlugs.add(s);
      push(mistake.step);
    }
  }

  // 5 — Productive rotation: nudge the stalest of writing/speaking.
  if (steps.length < MAX_STEPS) {
    const prod = productiveStep(input, usedHrefs);
    if (prod) push(prod);
  }

  // 6 — Fresh at-level content to keep breadth (respects recent history).
  if (steps.length < MAX_STEPS) {
    const fresh = freshContentStep(input, usedHrefs);
    if (fresh) push(fresh);
  }

  // 7 — Daily-goal filler so the plan always ends with a completable list.
  if (steps.length === 0) {
    push({
      id: "goal-vocab",
      kind: "goal",
      skill: "vocabulary",
      title: level ? `New words at ${level}` : "Learn your first 10 words",
      description: "Short set with audio and flashcards.",
      href: "/vocabulary",
      reason: level ? `Picked for ${level} level` : "Start building your dictionary",
      xpEstimate: 10,
      minutes: 10,
      level,
    });
  }

  // Cap total time: drop trailing filler steps over budget (never drop review/challenge).
  let totalMinutes = steps.reduce((s, st) => s + st.minutes, 0);
  while (steps.length > 2 && totalMinutes > MAX_MINUTES) {
    const dropped = steps.pop() as SmartStep;
    usedHrefs.delete(dropped.href);
    totalMinutes -= dropped.minutes;
  }

  const ranked = steps.map((s, i) => ({ ...s, id: s.id }));
  void ranked;
  return {
    steps: steps.map((s, i) => ({ ...s, id: s.id.startsWith(`step-`) ? `step-${i + 1}-${s.id}` : s.id })),
    meta: {
      totalMinutes,
      totalXp: steps.reduce((s, st) => s + st.xpEstimate, 0),
      focusSkills: Array.from(new Set(steps.map((s) => s.skill))),
      level,
      todayKey: input.todayKey,
    },
  };
}

function weakSkillStep(
  skill: string,
  acc: number | null,
  level: Level | null,
  input: SmartPathInput,
  remedial: boolean
): { step: SmartStep; used?: string[] } | null {
  const label = skillLabel(skill);
  const weakReason = acc !== null ? `${acc}% ${label.toLowerCase()} accuracy — needs work` : `${label} not started yet`;
  const target = (level ?? "A1") as Level;

  if (skill === "grammar") {
    const worst = input.worstSlugs.find((w) => w.skill === "grammar");
    if (worst && worst.accuracyPct < 100) {
      return {
        used: [worst.slug],
        step: {
          id: "weak-grammar-slug", kind: "weak-skill", skill,
          title: `Grammar fix: ${worst.title}`,
          description: "Retake the topic you scored lowest on — explanations included.",
          href: `/grammar/${worst.slug}`,
          reason: `${weakReason} · lowest topic “${worst.title}” (${worst.accuracyPct}%)`,
          xpEstimate: 15, minutes: 12, level,
        },
      };
    }
    const pick = pickContent(GRAMMAR_LEVELLED, target, input.recentSlugs, remedial);
    if (pick) {
      return {
        used: [pick.slug],
        step: {
          id: "weak-grammar", kind: "weak-skill", skill,
          title: `Grammar: ${pick.title}`,
          description: remedial ? `Step-down practice at ${pick.level} to rebuild the basics.` : `Focused practice at your level (${pick.level}).`,
          href: `/grammar/${pick.slug}`,
          reason: weakReason + (pick.remedial ? ` · easing down to ${pick.level}` : ""),
          xpEstimate: 15, minutes: 12, level: pick.level,
        },
      };
    }
  }

  if (skill === "reading" || skill === "dictation") {
    const worst = input.worstSlugs.find((w) => w.skill === "reading");
    if (worst && worst.accuracyPct < 100) {
      return {
        used: [worst.slug],
        step: {
          id: "weak-reading-slug", kind: "weak-skill", skill: "reading",
          title: `Re-read: ${worst.title}`,
          description: "Same passage, fresh attempt — comprehension questions included.",
          href: `/reading/${worst.slug}`,
          reason: `${weakReason} · lowest passage “${worst.title}” (${worst.accuracyPct}%)`,
          xpEstimate: 18, minutes: 12, level,
        },
      };
    }
    const pick = pickContent(READING_LEVELLED, target, input.recentSlugs, remedial);
    if (pick) {
      return {
        used: [pick.slug],
        step: {
          id: "weak-reading", kind: "weak-skill", skill: "reading",
          title: `Reading: ${pick.title}`,
          description: "Short article with comprehension questions + vocabulary in context.",
          href: `/reading/${pick.slug}`,
          reason: weakReason + (pick.remedial ? ` · easing down to ${pick.level}` : ""),
          xpEstimate: 18, minutes: 12, level: pick.level,
        },
      };
    }
  }

  if (skill === "listening") {
    const worst = input.worstSlugs.find((w) => w.skill === "listening");
    if (worst && worst.accuracyPct < 100) {
      return {
        used: [worst.slug],
        step: {
          id: "weak-listening-slug", kind: "weak-skill", skill,
          title: `Re-listen: ${worst.title}`,
          description: "Same track with transcript mode — then retry the questions.",
          href: `/listening/${worst.slug}`,
          reason: `${weakReason} · lowest track “${worst.title}” (${worst.accuracyPct}%)`,
          xpEstimate: 18, minutes: 10, level,
        },
      };
    }
    const pick = pickContent(LISTENING_LEVELLED, target, input.recentSlugs, remedial);
    if (pick) {
      return {
        used: [pick.slug],
        step: {
          id: "weak-listening", kind: "weak-skill", skill,
          title: `Listening: ${pick.title}`,
          description: "Dialogue with transcript mode and dictation lines.",
          href: `/listening/${pick.slug}`,
          reason: weakReason + (pick.remedial ? ` · easing down to ${pick.level}` : ""),
          xpEstimate: 18, minutes: 10, level: pick.level,
        },
      };
    }
  }

  if (skill === "pronunciation") {
    const worst = input.worstSlugs.find((w) => w.skill === "pronunciation");
    if (worst && worst.accuracyPct < 100) {
      return {
        used: [worst.slug],
        step: {
          id: "weak-pron-slug", kind: "weak-skill", skill,
          title: `Re-drill: ${worst.title}`,
          description: "Same drill with slow reference audio — then re-rate your attempt.",
          href: `/pronunciation/${worst.slug}`,
          reason: `${weakReason} · lowest drill “${worst.title}” (${worst.accuracyPct}%)`,
          xpEstimate: 12, minutes: 8, level,
        },
      };
    }
    const pick = pickContent(PRON_LEVELLED, target, input.recentSlugs, remedial);
    if (pick) {
      return {
        used: [pick.slug],
        step: {
          id: "weak-pron", kind: "weak-skill", skill,
          title: `Pronunciation: ${pick.title}`,
          description: "Minimal pairs, stress and intonation with slow + normal audio.",
          href: `/pronunciation/${pick.slug}`,
          reason: weakReason + (pick.remedial ? ` · easing down to ${pick.level}` : ""),
          xpEstimate: 12, minutes: 8, level: pick.level,
        },
      };
    }
  }

  if (skill === "vocabulary") {
    const avg = input.avgMastery;
    return {
      step: {
        id: "weak-vocab", kind: "weak-skill", skill,
        title: avg !== null && avg < 40 ? "Rebuild core words" : "Strengthen vocabulary",
        description: "Practice set prefers your lowest-mastery saved words.",
        href: "/vocabulary/practice",
        reason: avg !== null ? `${weakReason} · avg mastery ${avg}%` : weakReason,
        xpEstimate: 20, minutes: 10, level,
      },
    };
  }

  if (skill === "spelling") {
    const top = input.misspelledWords[0] ?? null;
    return {
      step: {
        id: "weak-spelling", kind: "weak-skill", skill,
        title: top ? `Fix spelling: “${top.word}”` : "Spelling workout",
        description: "Listen & type, missing letters and meaning modes.",
        href: "/spelling",
        reason: top ? `${weakReason} · “${top.word}” missed ${top.misses}×` : weakReason,
        xpEstimate: 15, minutes: 8, level,
      },
    };
  }

  if (skill === "writing") {
    const err = input.writingErrors[0] ?? null;
    return {
      step: {
        id: "weak-writing", kind: "weak-skill", skill,
        title: "Writing: short paragraph",
        description: "Write 80–120 words and get instant correction + feedback.",
        href: "/writing",
        reason: err ? `${weakReason} · most errors: ${err.category} (${err.count})` : weakReason,
        xpEstimate: 17, minutes: 15, level,
      },
    };
  }

  if (skill === "speaking" || skill === "read-aloud") {
    return {
      step: {
        id: "weak-speaking", kind: "weak-skill", skill,
        title: skill === "read-aloud" ? "Read Aloud: pronunciation" : "Speaking: Topic Talk",
        description: skill === "read-aloud" ? "Read a passage aloud and get pronunciation analysis." : "2-minute talk with transcript + AI feedback.",
        href: "/speaking",
        reason: weakReason,
        xpEstimate: 17, minutes: 10, level,
      },
    };
  }

  // Fallback for any unknown skill key.
  return {
    step: {
      id: `weak-${skill}`, kind: "weak-skill", skill,
      title: `${label} practice`,
      description: "Targeted practice for your weakest area.",
      href: skillHref(skill),
      reason: weakReason,
      xpEstimate: 15, minutes: 10, level,
    },
  };
}

function mistakeStep(
  input: SmartPathInput,
  usedHrefs: Set<string>,
  usedSlugs: Set<string>
): { step: SmartStep; used?: string[] } | null {
  // Worst grammar/reading/listening slug not already used by the weak step.
  const slug = input.worstSlugs.find((w) => !usedSlugs.has(w.slug) && w.accuracyPct < 100 && w.attempts > 0) ?? null;
  if (slug) {
    const href = slug.skill === "grammar" ? `/grammar/${slug.slug}` : slug.skill === "reading" ? `/reading/${slug.slug}` : `/listening/${slug.slug}`;
    if (!usedHrefs.has(href)) {
      return {
        used: [slug.slug],
        step: {
          id: "mistake-slug", kind: "mistakes", skill: slug.skill,
          title: `Fix mistakes: ${slug.title}`,
          description: "Retry the exact activity where you lost points.",
          href,
          reason: `Scored ${slug.accuracyPct}% on “${slug.title}” — retry to lock it in`,
          xpEstimate: 15, minutes: 10,
          level: input.level,
        },
      };
    }
  }
  // Recurring writing error pattern.
  const err = input.writingErrors[0] ?? null;
  if (err && !usedHrefs.has("/writing")) {
    return {
      step: {
        id: "mistake-writing", kind: "mistakes", skill: "writing",
        title: `Writing focus: ${err.category}`,
        description: "One short text, watching for your most frequent error type.",
        href: "/writing",
        reason: `${err.count} recent ${err.category} error${err.count === 1 ? "" : "s"} in your writing`,
        xpEstimate: 17, minutes: 15,
        level: input.level,
      },
    };
  }
  // Most-missed spelling word.
  const miss = input.misspelledWords.find((m) => m.misses > 0) ?? null;
  if (miss && !usedHrefs.has("/spelling")) {
    return {
      step: {
        id: "mistake-spelling", kind: "mistakes", skill: "spelling",
        title: `Spell it right: “${miss.word}”`,
        description: "Dictation + missing-letter drills on your missed words.",
        href: "/spelling",
        reason: `Missed “${miss.word}” ${miss.misses}× — targeted drill`,
        xpEstimate: 15, minutes: 8,
        level: input.level,
      },
    };
  }
  return null;
}

function productiveStep(input: SmartPathInput, usedHrefs: Set<string>): SmartStep | null {
  const w = input.writingDaysAgo;
  const s = input.speakingDaysAgo;
  const writingStale = w === null || w >= 5;
  const speakingStale = s === null || s >= 5;
  if (!writingStale && !speakingStale) return null;
  // Nudge whichever is stalest (never-started counts as stalest).
  const writingScore = w === null ? Number.POSITIVE_INFINITY : w;
  const speakingScore = s === null ? Number.POSITIVE_INFINITY : s;
  if (writingScore >= speakingScore && !usedHrefs.has("/writing") && !input.recentKinds.includes("writing")) {
    return {
      id: "productive-writing", kind: "productive", skill: "writing",
      title: "Writing: keep the habit",
      description: "One short paragraph — productive practice counts double for fluency.",
      href: "/writing",
      reason: w === null ? "No writing yet — productive skills need reps" : `No writing for ${w} days`,
      xpEstimate: 17, minutes: 15,
      level: input.level,
    };
  }
  if (!usedHrefs.has("/speaking") && !input.recentKinds.includes("speaking")) {
    return {
      id: "productive-speaking", kind: "productive", skill: "speaking",
      title: "Speaking: Topic Talk",
      description: "2-minute talk with transcript + AI feedback.",
      href: "/speaking",
      reason: s === null ? "No speaking yet — start with an easy topic" : `No speaking for ${s} days`,
      xpEstimate: 17, minutes: 10,
      level: input.level,
    };
  }
  return null;
}

function freshContentStep(input: SmartPathInput, usedHrefs: Set<string>): SmartStep | null {
  const target = (input.level ?? "A1") as Level;
  // Prefer modules the learner hasn't touched this week (variety), at their level.
  const candidates: Array<{ skill: string; pool: Levelled[]; hrefOf: (slug: string) => string; titleOf: (t: string) => string; desc: string; xp: number; minutes: number }> = [
    {
      skill: "reading", pool: READING_LEVELLED, hrefOf: (s) => `/reading/${s}`,
      titleOf: (t) => `Reading: ${t}`, desc: "New article + comprehension questions.", xp: 18, minutes: 12,
    },
    {
      skill: "listening", pool: LISTENING_LEVELLED, hrefOf: (s) => `/listening/${s}`,
      titleOf: (t) => `Listening: ${t}`, desc: "New dialogue or podcast with transcript.", xp: 18, minutes: 10,
    },
    {
      skill: "pronunciation", pool: PRON_LEVELLED, hrefOf: (s) => `/pronunciation/${s}`,
      titleOf: (t) => `Pronunciation: ${t}`, desc: "New drill with slow + normal reference audio.", xp: 12, minutes: 8,
    },
    {
      skill: "grammar", pool: GRAMMAR_LEVELLED, hrefOf: (s) => `/grammar/${s}`,
      titleOf: (t) => `Grammar: ${t}`, desc: "New topic with explanations + quiz.", xp: 15, minutes: 12,
    },
  ];
  const ordered = [...candidates].sort((a, b) => {
    const ra = input.recentKinds.includes(a.skill) ? 1 : 0;
    const rb = input.recentKinds.includes(b.skill) ? 1 : 0;
    return ra - rb;
  });
  for (const c of ordered) {
    const usedForSkill = input.worstSlugs.filter((w) => w.skill === c.skill).map((w) => w.slug);
    const pick = pickContent(c.pool.filter((i) => !usedForSkill.includes(i.slug)), target, input.recentSlugs, false)
      ?? pickContent(c.pool, target, input.recentSlugs, false);
    if (!pick) continue;
    const href = c.hrefOf(pick.slug);
    if (usedHrefs.has(href)) continue;
    return {
      id: `new-${c.skill}`, kind: "new", skill: c.skill,
      title: c.titleOf(pick.title),
      description: c.desc,
      href,
      reason: `Fresh ${c.skill} at ${pick.level} — not attempted recently`,
      xpEstimate: c.xp, minutes: c.minutes,
      level: pick.level,
    };
  }
  // Vocabulary breadth fallback when every library item is exhausted.
  if (!usedHrefs.has("/vocabulary")) {
    const bankAtLevel = VOCAB_BANK.filter((w) => (levelOrNull(input.level) ?? "A1") === w.level);
    void bankAtLevel;
    return {
      id: "new-vocab", kind: "new", skill: "vocabulary",
      title: input.level ? `New words at ${input.level}` : "Expand vocabulary",
      description: "Learn new words and save them to your dictionary.",
      href: "/vocabulary",
      reason: "Breadth matters — fresh words feed reading, listening and writing",
      xpEstimate: 10, minutes: 10,
      level: input.level,
    };
  }
  return null;
}

function levelOrNull(level: Level | null): Level | null {
  return level;
}

/** Deterministic starter plan for signed-out / unconfigured visitors (no backend). */
export function buildPreviewSmartPath(level: Level | null, todayKey: string): SmartPathPlan {
  const target = (level ?? "A1") as Level;
  const reading = pickContent(READING_LEVELLED, target, [], false);
  const grammar = pickContent(GRAMMAR_LEVELLED, target, [], false);
  const steps: SmartStep[] = [
    {
      id: "preview-challenge", kind: "challenge", skill: "challenge",
      title: "Today's Daily Challenge",
      description: "5 quick questions across skills · up to 60 XP.",
      href: "/daily-challenge",
      reason: "Start here every day",
      xpEstimate: 40, minutes: 10, level: target,
    },
    {
      id: "preview-vocab", kind: "new", skill: "vocabulary",
      title: level ? `New words at ${level}` : "Learn your first 10 words",
      description: "Short set with audio and flashcards.",
      href: "/vocabulary",
      reason: level ? `Picked for ${level} level` : "Build your dictionary from day one",
      xpEstimate: 10, minutes: 10, level: target,
    },
  ];
  if (reading) {
    steps.push({
      id: "preview-reading", kind: "new", skill: "reading",
      title: `Reading: ${reading.title}`,
      description: "Short article with comprehension questions.",
      href: `/reading/${reading.slug}`,
      reason: `Picked for ${reading.level} level`,
      xpEstimate: 18, minutes: 12, level: reading.level,
    });
  }
  if (grammar && steps.length < MAX_STEPS) {
    steps.push({
      id: "preview-grammar", kind: "new", skill: "grammar",
      title: `Grammar: ${grammar.title}`,
      description: "Focused topic with explanations + quiz.",
      href: `/grammar/${grammar.slug}`,
      reason: `Picked for ${grammar.level} level`,
      xpEstimate: 15, minutes: 12, level: grammar.level,
    });
  }
  const totalMinutes = steps.reduce((s, st) => s + st.minutes, 0);
  return {
    steps,
    meta: {
      totalMinutes,
      totalXp: steps.reduce((s, st) => s + st.xpEstimate, 0),
      focusSkills: Array.from(new Set(steps.map((s) => s.skill))),
      level,
      todayKey,
    },
  };
}
