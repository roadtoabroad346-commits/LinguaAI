/** Phase 4 — deterministic listening library (no AI). 10 tracks, 2 per level A1–C1. */
import type { Level } from "@/types/database";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";

export interface DialogueLine { speaker: string; text: string; }
export interface ListeningQuestion { id: string; prompt: string; choices: string[]; answer: number; explanation: string; }

export interface ListeningTrack {
  slug: string;
  level: Level;
  title: string;
  kind: "dialogue" | "monologue" | "podcast";
  minutes: number;
  vocabFocus: string[];
  summary: string;
  lines: DialogueLine[];
  /** Indexes into `lines` used for dictation (exact sentences). */
  dictationIndexes: number[];
  questions: ListeningQuestion[];
}

function q(
  slug: string, n: number, prompt: string, choices: string[], answer: number, explanation: string,
): ListeningQuestion {
  return { id: `${slug}-lq${n}`, prompt, choices, answer, explanation };
}

export const LISTENING_TRACKS: ListeningTrack[] = [
  {
    slug: "at-the-cafe", level: "A1", title: "At the Café", kind: "dialogue", minutes: 2,
    vocabFocus: ["water", "eat", "happy", "kind", "big"],
    summary: "Anna orders breakfast. Slow, clear A1 dialogue.",
    lines: [
      { speaker: "Anna", text: "Good morning! A glass of water, please." },
      { speaker: "Sam", text: "Good morning! Here you are. Would you like to eat something?" },
      { speaker: "Anna", text: "Yes, a big breakfast, please. Eggs and bread." },
      { speaker: "Sam", text: "Of course. Anything to drink with that?" },
      { speaker: "Anna", text: "A small coffee, please. Thank you, you are very kind!" },
      { speaker: "Sam", text: "You are welcome! Your food will be ready in five minutes." },
    ],
    dictationIndexes: [0, 4],
    questions: [
      q("at-the-cafe", 1, "What does Anna drink first?", ["Coffee", "A glass of water", "Tea", "Juice"], 1, "“A glass of water, please.”"),
      q("at-the-cafe", 2, "What does she order to eat?", ["Only fruit", "Eggs and bread", "Cake", "Nothing"], 1, "“Eggs and bread.”"),
      q("at-the-cafe", 3, "How long is the wait?", ["Two minutes", "Five minutes", "Ten minutes", "One hour"], 1, "“Ready in five minutes.”"),
    ],
  },
  {
    slug: "meeting-a-family", level: "A1", title: "Meeting a Family", kind: "dialogue", minutes: 2,
    vocabFocus: ["family", "house", "book", "learn", "bright"],
    summary: "Tom meets his friend's family. Introductions and small talk.",
    lines: [
      { speaker: "Tom", text: "Hi! Is this your house? It is very bright!" },
      { speaker: "Lena", text: "Yes! Come in. This is my family — my mother, my father and my little brother." },
      { speaker: "Tom", text: "Nice to meet you! I am learning English with Lena at school." },
      { speaker: "Mother", text: "Welcome, Tom! Would you like some cake?" },
      { speaker: "Tom", text: "Yes, please. And is that your book on the table?" },
      { speaker: "Lena", text: "Yes, it has many pictures. I can show you after cake!" },
    ],
    dictationIndexes: [2, 3],
    questions: [
      q("meeting-a-family", 1, "Who does Tom meet?", ["Only Lena", "Lena's family", "A teacher", "A neighbour"], 1, "Mother, father and brother."),
      q("meeting-a-family", 2, "Where does Tom learn English?", ["At home", "At school with Lena", "At the market", "Online"], 1, "“At school.”"),
      q("meeting-a-family", 3, "What is on the table?", ["Cake", "A book with pictures", "A bag", "Water"], 1, "“That your book on the table?”"),
    ],
  },
  {
    slug: "weekend-plans", level: "A2", title: "Weekend Plans", kind: "dialogue", minutes: 3,
    vocabFocus: ["invite", "weather", "often", "choice", "borrow"],
    summary: "Two friends choose between the park and the museum.",
    lines: [
      { speaker: "Paul", text: "The weather will be sunny on Saturday. Shall we go to the park?" },
      { speaker: "Maria", text: "I would love to! Can I invite my cousin too? She often visits on weekends." },
      { speaker: "Paul", text: "Of course. We can borrow my brother's ball and play football." },
      { speaker: "Maria", text: "Good idea. Or we can visit the museum if it rains. It is a difficult choice!" },
      { speaker: "Paul", text: "Let's check the weather on Friday and decide. I will text you." },
      { speaker: "Maria", text: "Perfect. I will bring sandwiches for everyone." },
    ],
    dictationIndexes: [0, 4],
    questions: [
      q("weekend-plans", 1, "What is the first plan?", ["Museum", "Park on Saturday", "Cinema", "Swimming"], 1, "“Shall we go to the park?”"),
      q("weekend-plans", 2, "Who else may come?", ["Maria's cousin", "Paul's teacher", "Nobody", "The brother"], 0, "“Can I invite my cousin?”"),
      q("weekend-plans", 3, "What is the backup plan?", ["Stay home", "Visit the museum if it rains", "Play tennis", "Cancel"], 1, "“Visit the museum if it rains.”"),
    ],
  },
  {
    slug: "good-habits", level: "A2", title: "Good Habits Podcast", kind: "podcast", minutes: 3,
    vocabFocus: ["habit", "carefully", "achieve", "reply", "repair"],
    summary: "A short podcast: three habits of successful learners.",
    lines: [
      { speaker: "Host", text: "Welcome to Good Habits! Today: three habits of successful English learners." },
      { speaker: "Host", text: "Habit one: read carefully for ten minutes every day. Small steps help you achieve big goals." },
      { speaker: "Host", text: "Habit two: reply to one message in English daily. Write to a friend, a teacher, anyone." },
      { speaker: "Host", text: "Habit three: repair your mistakes. Keep a notebook, write the correction, and review it weekly." },
      { speaker: "Host", text: "That is all for today. Choose one habit and start tonight!" },
    ],
    dictationIndexes: [1, 3],
    questions: [
      q("good-habits", 1, "How long should you read daily?", ["One hour", "Ten minutes", "Thirty minutes", "All evening"], 1, "“Ten minutes every day.”"),
      q("good-habits", 2, "What is habit two?", ["Watch films", "Reply to one message in English", "Buy a book", "Sleep early"], 1, "“Reply to one message.”"),
      q("good-habits", 3, "How should you handle mistakes?", ["Ignore them", "Write and review corrections", "Stop writing", "Change teacher"], 1, "“Write the correction, and review it.”"),
    ],
  },
  {
    slug: "job-interview-tips", level: "B1", title: "Job Interview Tips", kind: "podcast", minutes: 4,
    vocabFocus: ["opportunity", "experience", "suggest", "decision", "reliable"],
    summary: "A career coach explains how to turn interviews into offers.",
    lines: [
      { speaker: "Coach", text: "Every interview is an opportunity. Employers do not just buy experience — they buy trust." },
      { speaker: "Coach", text: "First, research the company. Suggest one clear idea: how you would improve one small thing." },
      { speaker: "Coach", text: "Second, be reliable with basics: arrive early, dress well, bring questions." },
      { speaker: "Coach", text: "Third, decisions are made in the last five minutes. End with a strong question, like: what does success look like here?" },
      { speaker: "Coach", text: "Finally, send a short thank-you note the same day. Few people do — so you will stand out." },
    ],
    dictationIndexes: [1, 4],
    questions: [
      q("job-interview-tips", 1, "What do employers buy?", ["Only degrees", "Trust", "Cheap labour", "Long CVs"], 1, "“They buy trust.”"),
      q("job-interview-tips", 2, "What should you suggest?", ["A higher salary", "One clear improvement idea", "A new office", "Less work"], 1, "“How you would improve one small thing.”"),
      q("job-interview-tips", 3, "What should you send after?", ["A long essay", "A short thank-you note", "Flowers", "Nothing"], 1, "“A short thank-you note the same day.”"),
    ],
  },
  {
    slug: "crowded-city", level: "B1", title: "A Crowded City", kind: "dialogue", minutes: 4,
    vocabFocus: ["crowded", "suddenly", "expect", "benefit", "widely"],
    summary: "Omar calls his sister after his first week in the capital.",
    lines: [
      { speaker: "Omar", text: "Hi! My first week in the capital is over. The trains are so crowded!" },
      { speaker: "Sister", text: "I expected that! How is your room? Is it quiet?" },
      { speaker: "Omar", text: "Small but fine. Yesterday it suddenly rained and everyone ran into the metro at once." },
      { speaker: "Sister", text: "That sounds stressful. Do you see any benefits so far?" },
      { speaker: "Omar", text: "Yes! The labs are excellent, and English is widely spoken on campus. I already have a study group." },
      { speaker: "Sister", text: "See? You made the right decision. Come home at the weekend and tell me everything." },
    ],
    dictationIndexes: [0, 4],
    questions: [
      q("crowded-city", 1, "What surprises Omar most?", ["Quiet streets", "Crowded trains", "Cheap food", "Big parks"], 1, "“The trains are so crowded!”"),
      q("crowded-city", 2, "What happened in the rain?", ["He stayed home", "Everyone ran into the metro", "He lost his bag", "Classes stopped"], 1, "“Everyone ran into the metro at once.”"),
      q("crowded-city", 3, "What benefit does he mention?", ["Excellent labs and English on campus", "Low prices", "Short days", "Free food"], 0, "“Labs are excellent … widely spoken.”"),
    ],
  },
  {
    slug: "insight-interview", level: "B2", title: "The Insight Interview", kind: "podcast", minutes: 5,
    vocabFocus: ["insight", "efficient", "persist", "controversy", "consequence"],
    summary: "A psychologist on deep work, focus and the cost of multitasking.",
    lines: [
      { speaker: "Host", text: "Today we ask: why does multitasking feel efficient but fail? Our guest is a work psychologist." },
      { speaker: "Guest", text: "Because switching feels fast. But every switch has a consequence — errors rise and insight disappears." },
      { speaker: "Guest", text: "My advice: protect ninety minutes each morning. No messages. People who persist with one task outperform busy switchers." },
      { speaker: "Host", text: "That idea caused controversy online. Managers said it was impossible." },
      { speaker: "Guest", text: "Start small. Two quiet mornings a week. Measure output, not hours. The data convinces even sceptics." },
    ],
    dictationIndexes: [1, 2],
    questions: [
      q("insight-interview", 1, "Why does multitasking feel efficient?", ["It is measured", "Switching feels fast", "It is quiet", "Managers like it"], 1, "“Switching feels fast.”"),
      q("insight-interview", 2, "What is the recommended block?", ["Ten minutes", "Ninety minutes, no messages", "All day", "Five minutes"], 1, "“Ninety minutes … No messages.”"),
      q("insight-interview", 3, "How to convince sceptics?", ["Argue loudly", "Measure output, not hours", "Work weekends", "Quit"], 1, "“Measure output, not hours.”"),
    ],
  },
  {
    slug: "keep-going", level: "B2", title: "Keep Going", kind: "monologue", minutes: 5,
    vocabFocus: ["persist", "diverse", "inevitable", "interpret", "reluctantly"],
    summary: "A runner on injuries, slow progress and coming back stronger.",
    lines: [
      { speaker: "Nadia", text: "Two years ago I could not run one kilometre. I started slowly — walk, jog, walk again." },
      { speaker: "Nadia", text: "Progress was diverse: some weeks fast, some weeks painful. Setbacks are inevitable, I learned." },
      { speaker: "Nadia", text: "My coach taught me to interpret pain correctly. Tired is fine. Sharp is a stop signal." },
      { speaker: "Nadia", text: "Last month I reluctantly skipped a race to rest. It was the right call — this week I ran ten kilometres." },
      { speaker: "Nadia", text: "So persist. Slow is not failure. Slow is how comebacks are built." },
    ],
    dictationIndexes: [1, 4],
    questions: [
      q("keep-going", 1, "How did Nadia start?", ["Ten kilometres daily", "Walk-jog cycles", "A marathon", "Gym weights"], 1, "“Walk, jog, walk again.”"),
      q("keep-going", 2, "What is the pain rule?", ["Tired is fine, sharp means stop", "Ignore everything", "Always stop", "Never rest"], 0, "“Tired is fine. Sharp is a stop signal.”"),
      q("keep-going", 3, "What was the right call?", ["Skipping a race to rest", "Running injured", "Quitting", "Changing coach"], 0, "“Skipped a race to rest.”"),
    ],
  },
  {
    slug: "language-of-power", level: "C1", title: "The Language of Power", kind: "podcast", minutes: 6,
    vocabFocus: ["eloquent", "ambiguous", "pragmatic", "profoundly", "meticulous"],
    summary: "A linguist on why precise words persuade more than loud words.",
    lines: [
      { speaker: "Host", text: "Why do some speeches change minds while others fade? A linguist explains the language of power." },
      { speaker: "Linguist", text: "Eloquent speakers are profoundly precise. They choose one strong verb instead of five vague adjectives." },
      { speaker: "Linguist", text: "They also avoid ambiguous promises. Not “we will improve things,” but “we will cut waiting times to ten days.”" },
      { speaker: "Linguist", text: "The method is pragmatic and meticulous: draft, cut half, read aloud, cut again." },
      { speaker: "Linguist", text: "So power is not volume. It is clarity plus evidence, delivered calmly." },
    ],
    dictationIndexes: [1, 4],
    questions: [
      q("language-of-power", 1, "What do eloquent speakers choose?", ["Five adjectives", "One strong verb", "Loud volume", "Long sentences"], 1, "“One strong verb instead of five vague adjectives.”"),
      q("language-of-power", 2, "What is an ambiguous promise?", ["A precise date", "“We will improve things”", "A budget number", "A name"], 1, "Vague “improve things” vs precise “ten days.”"),
      q("language-of-power", 3, "What is the editing method?", ["Draft, cut half, read aloud, cut again", "Write once", "Add adjectives", "Shout it"], 0, "“Draft, cut half, read aloud, cut again.”"),
    ],
  },
  {
    slug: "luck-by-design", level: "C1", title: "Luck by Design", kind: "monologue", minutes: 6,
    vocabFocus: ["serendipity", "resilience", "exemplify", "inevitably", "deteriorate", "scrutinize"],
    summary: "An architect on designing a life with more useful accidents.",
    lines: [
      { speaker: "Elena", text: "People call my career serendipity. I call it design. I put myself where interesting collisions happen." },
      { speaker: "Elena", text: "Each month I scrutinize one failure: what broke, what I controlled, what I will change." },
      { speaker: "Elena", text: "Networks inevitably decay if you ignore them — skills deteriorate too. So I teach, I write, I share drafts early." },
      { speaker: "Elena", text: "Resilient careers exemplify one habit: small bets, often. Ten tiny experiments beat one giant plan." },
      { speaker: "Elena", text: "So design your luck: show up, share early, review monthly — and let chance do the rest." },
    ],
    dictationIndexes: [0, 3],
    questions: [
      q("luck-by-design", 1, "What does Elena call serendipity?", ["Pure chance", "Design — engineered collisions", "Talent", "Money"], 1, "“I call it design.”"),
      q("luck-by-design", 2, "What does she scrutinize monthly?", ["One failure", "Her salary", "News", "Friends"], 0, "“Scrutinize one failure.”"),
      q("luck-by-design", 3, "What beats one giant plan?", ["Ten tiny experiments", "One big loan", "Waiting", "Luck alone"], 0, "“Ten tiny experiments beat one giant plan.”"),
    ],
  },
];

const BY_SLUG = new Map(LISTENING_TRACKS.map((t) => [t.slug, t]));

export function getListeningTrack(slug: string): ListeningTrack | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function listListeningTracks(level?: string | null, kind?: string | null): ListeningTrack[] {
  return LISTENING_TRACKS.filter((t) => {
    if (level && level !== "all" && t.level !== level) return false;
    if (kind && kind !== "all" && t.kind !== kind) return false;
    return true;
  });
}

export function trackFullText(t: ListeningTrack): string {
  return t.lines.map((l) => `${l.speaker}: ${l.text}`).join("\n");
}

export function trackSpeakText(t: ListeningTrack): string {
  return t.lines.map((l) => l.text).join(" ");
}

export function dictationSentences(t: ListeningTrack): string[] {
  return t.dictationIndexes.map((i) => t.lines[i]?.text).filter(Boolean);
}

/** Normalise for forgiving dictation grading: lowercase, strip punctuation/extra spaces. */
export function normaliseDictation(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9'\s]/g, "").replace(/\s+/g, " ").trim();
}

export function gradeDictation(expected: string, typed: string): { exact: boolean; similarity: number } {
  const a = normaliseDictation(expected);
  const b = normaliseDictation(typed);
  if (!a || !b) return { exact: false, similarity: 0 };
  if (a === b) return { exact: true, similarity: 1 };
  const dist = levenshtein(a, b);
  const similarity = Math.max(0, 1 - dist / Math.max(a.length, b.length));
  return { exact: false, similarity: Math.round(similarity * 100) / 100 };
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export const LISTENING_XP_PER_CORRECT = XP_RULES.listening.perCorrect;
export const LISTENING_BONUS_XP = XP_RULES.listening.bonus;
export const DICTATION_XP = XP_RULES.dictation.exactXp;

export interface ListeningGrade { score: number; total: number; correctIds: string[]; xpEarned: number; perfect: boolean; }

export function toPublicListeningQuestions(t: ListeningTrack) {
  return t.questions.map((x) => ({ id: x.id, prompt: x.prompt, choices: x.choices }));
}

export function gradeListeningSelections(
  track: ListeningTrack,
  selections: Array<{ questionId: string; selected: number; choices: string[] }>,
): ListeningGrade {
  let score = 0;
  const correctIds: string[] = [];
  const byId = new Map(track.questions.map((x) => [x.id, x]));
  for (const s of selections) {
    const x = byId.get(s.questionId);
    if (!x) continue;
    if (Number.isInteger(s.selected) && s.choices[s.selected] === x.choices[x.answer]) {
      score += 1;
      correctIds.push(x.id);
    }
  }
  const total = track.questions.length;
  const perfect = total > 0 && score === total;
  return { score, total, correctIds, xpEarned: xpForGradedSet(XP_RULES.listening.perCorrect, XP_RULES.listening.bonus, score, total), perfect };
}
