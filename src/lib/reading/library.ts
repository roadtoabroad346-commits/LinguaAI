/** Phase 4 — deterministic reading library (no AI). 10 passages, 2 per level A1–C1. */
import type { Level } from "@/types/database";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";

export interface ReadingQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface ReadingPassage {
  slug: string;
  level: Level;
  title: string;
  minutes: number;
  vocabFocus: string[];
  paragraphs: string[];
  questions: ReadingQuestion[];
}

function q(
  slug: string, n: number, prompt: string, choices: string[], answer: number, explanation: string,
): ReadingQuestion {
  return { id: `${slug}-rq${n}`, prompt, choices, answer, explanation };
}

export const READING_PASSAGES: ReadingPassage[] = [
  {
    slug: "morning-routine", level: "A1", title: "My Morning Routine", minutes: 2,
    vocabFocus: ["bright", "water", "happy", "quickly", "house", "eat"],
    paragraphs: [
      "Anna lives in a small house near the school. Every morning, bright light comes through her window at seven o'clock. She is happy to start a new day.",
      "First, she drinks a glass of water. Then she eats breakfast with her family. After breakfast, she quickly cleans her room and takes her book to school.",
      "Anna likes to learn new words on the way to school. Her journey takes fifteen minutes. She walks with her big dog and enjoys the fresh air.",
    ],
    questions: [
      q("morning-routine", 1, "Where does Anna live?", ["In a big city flat", "In a small house near the school", "With her teacher", "In another country"], 1, "The first paragraph says “a small house near the school.”"),
      q("morning-routine", 2, "What does Anna do first in the morning?", ["Cleans her room", "Drinks a glass of water", "Walks her dog", "Reads a book"], 1, "“First, she drinks a glass of water.”"),
      q("morning-routine", 3, "How does Anna go to school?", ["By bus", "By car", "She walks", "By bike"], 2, "“Her journey takes fifteen minutes. She walks…”"),
      q("morning-routine", 4, "The word “bright” in the text is closest to…", ["dark", "full of light", "noisy", "cold"], 1, "Bright light = full of light."),
    ],
  },
  {
    slug: "trip-to-market", level: "A1", title: "A Trip to the Market", minutes: 2,
    vocabFocus: ["kind", "family", "book", "big", "learn", "journey"],
    paragraphs: [
      "On Saturdays, Tom and his family go to the market. It is a big place with many colours and smells. The people there are kind and smile a lot.",
      "Tom wants to buy a book about animals. His mother buys bread and fruit. His father carries the heavy bags home.",
      "The journey home is short but fun. Tom learns the names of new fruits. He is happy to help his family.",
    ],
    questions: [
      q("trip-to-market", 1, "When do they go to the market?", ["On Sundays", "On Saturdays", "Every day", "In the evening"], 1, "“On Saturdays, Tom and his family go to the market.”"),
      q("trip-to-market", 2, "What does Tom want to buy?", ["Bread", "Fruit", "A book about animals", "A new bag"], 2, "He wants “a book about animals.”"),
      q("trip-to-market", 3, "Who carries the heavy bags?", ["Tom", "His mother", "His father", "A shopkeeper"], 2, "“His father carries the heavy bags home.”"),
      q("trip-to-market", 4, "How does Tom feel at the end?", ["Tired and angry", "Happy to help", "Bored", "Afraid"], 1, "“He is happy to help his family.”"),
    ],
  },
  {
    slug: "brave-choice", level: "A2", title: "A Brave Choice", minutes: 3,
    vocabFocus: ["brave", "choice", "achieve", "reply", "invite", "often"],
    paragraphs: [
      "Maria often walks past an old sports club. One day she sees a sign: “Learn to swim in 10 lessons!” She is afraid of water, but she wants to be brave.",
      "She talks to her family. Her brother says, “You can achieve anything if you try.” Her mother invites her friend Lena, who can already swim, to join the first lesson.",
      "The first lesson is hard. Maria cannot reply when the teacher asks her name — she is too nervous. But Lena smiles, and Maria tries again. After ten lessons, Maria swims across the pool. It was a difficult choice, but the best one.",
    ],
    questions: [
      q("brave-choice", 1, "What is Maria afraid of?", ["Sports clubs", "Water", "Her brother", "Swimming teachers"], 1, "“She is afraid of water.”"),
      q("brave-choice", 2, "Who joins the first lesson with Maria?", ["Her brother", "Her teacher", "Lena", "Nobody"], 2, "Her mother invites Lena to join."),
      q("brave-choice", 3, "Why can't Maria reply at first?", ["She is too nervous", "She doesn't hear", "She is angry", "She is late"], 0, "“She is too nervous.”"),
      q("brave-choice", 4, "What is the main idea?", ["Swimming is dangerous", "A brave choice can change you", "Sports clubs are expensive", "Friends swim better"], 1, "She tries despite fear and succeeds."),
    ],
  },
  {
    slug: "weather-story", level: "A2", title: "The Wrong Weather", minutes: 3,
    vocabFocus: ["weather", "carefully", "borrow", "habit", "loud", "repair"],
    paragraphs: [
      "Paul has a good habit: he checks the weather every morning. But one Tuesday he forgets. The sky is clear, so he borrows his friend's bike and rides to work.",
      "At noon, the weather changes. Loud thunder fills the sky and heavy rain starts. Paul has no coat. He drives carefully — no, he rides carefully — through the rain.",
      "A kind shopkeeper lets him wait inside. Paul calls the repair shop: his bike chain is broken too. That evening he buys a small raincoat and puts it in his bag. “Never again,” he laughs.",
    ],
    questions: [
      q("weather-story", 1, "What is Paul's good habit?", ["Riding a bike", "Checking the weather", "Repairing bikes", "Calling shops"], 1, "“He checks the weather every morning.”"),
      q("weather-story", 2, "Why is the ride home difficult?", ["The bike is too loud", "Heavy rain starts", "He forgets the way", "The shop is closed"], 1, "“Heavy rain starts.”"),
      q("weather-story", 3, "What else goes wrong?", ["He loses his bag", "The bike chain breaks", "The shopkeeper is rude", "His phone breaks"], 1, "“His bike chain is broken too.”"),
      q("weather-story", 4, "What does Paul do at the end?", ["Buys a raincoat", "Borrows a car", "Repairs the shop", "Stops cycling"], 0, "“He buys a small raincoat.”"),
    ],
  },
  {
    slug: "curious-inventor", level: "B1", title: "The Curious Inventor", minutes: 4,
    vocabFocus: ["curious", "improve", "suggest", "experience", "benefit", "opportunity"],
    paragraphs: [
      "Lena was a curious student. While other children played outside, she took old radios apart to see how they worked. Her teachers say curiosity is a great opportunity — if you use it well.",
      "At sixteen, she had an idea: a lamp that charges your phone while you read. Everyone said it was impossible. She suddenly remembered her grandfather's words: “A small improvement every day is enough.”",
      "Two years of experience followed — broken parts, long nights, many failures. A friend suggested a simpler design. The new lamp worked, and a local shop ordered fifty pieces. Lena says the real benefit was not money, but learning to keep going.",
    ],
    questions: [
      q("curious-inventor", 1, "What did Lena do as a child?", ["Played outside", "Took radios apart", "Sold lamps", "Wrote books"], 1, "“She took old radios apart.”"),
      q("curious-inventor", 2, "What was her invention?", ["A phone that reads books", "A lamp that charges phones", "A radio for schools", "A cheap battery"], 1, "“A lamp that charges your phone while you read.”"),
      q("curious-inventor", 3, "Who suggested a simpler design?", ["Her grandfather", "A teacher", "A friend", "A shopkeeper"], 2, "“A friend suggested a simpler design.”"),
      q("curious-inventor", 4, "What does Lena value most?", ["Money", "Fame", "Learning to keep going", "The shop order"], 2, "“The real benefit was … learning to keep going.”"),
    ],
  },
  {
    slug: "hard-decision", level: "B1", title: "A Hard Decision", minutes: 4,
    vocabFocus: ["decision", "expect", "reliable", "crowded", "suddenly", "widely"],
    paragraphs: [
      "Omar expected to study in his home city. Then a widely known university in the capital offered him a place. It was a hard decision: stay with his reliable friends, or move to a crowded city far from home?",
      "He made a list. Staying meant comfort. Moving meant better labs, new people, and a degree employers respect. His sister said, “You can always come back. You cannot always get this chance.”",
      "Suddenly the choice was clear. Omar moved in September. The first month was difficult — noisy streets, high prices, homesickness. By December, he had a study group, a part-time job, and no regrets.",
    ],
    questions: [
      q("hard-decision", 1, "What offer does Omar get?", ["A job in the capital", "A place at a known university", "A trip abroad", "A scholarship for sport"], 1, "“A widely known university … offered him a place.”"),
      q("hard-decision", 2, "What is the main advantage of moving?", ["Comfort", "Better labs and prospects", "Lower prices", "Quiet streets"], 1, "Better labs and respected degree."),
      q("hard-decision", 3, "What does his sister say?", ["Stay at home", "You can always come back", "Do not decide yet", "Choose comfort"], 1, "“You can always come back.”"),
      q("hard-decision", 4, "How does the story end?", ["He returns home", "He regrets moving", "He settles in with no regrets", "He changes subject"], 2, "“No regrets.”"),
    ],
  },
  {
    slug: "price-of-efficiency", level: "B2", title: "The Price of Efficiency", minutes: 5,
    vocabFocus: ["efficient", "consequence", "persist", "accurately", "interpret", "inevitable"],
    paragraphs: [
      "Modern offices worship efficiency. Short meetings, fast messages, accurately measured hours — every minute counts. The consequence is often invisible: people who persist through long, focused work are replaced by people who merely look busy.",
      "Psychologists warn that constant interruption has an inevitable cost. When workers switch tasks every three minutes, mistakes grow and insight disappears. One study found it takes twenty minutes to fully return to a complex task.",
      "The solution is not laziness but design. Some companies now protect two meeting-free hours each morning. Employees interpret the change as trust — and repay it. Output rises, stress falls, and efficiency finally means something.",
    ],
    questions: [
      q("price-of-efficiency", 1, "What does the author criticize?", ["Long meetings", "Fake busyness replacing deep work", "High salaries", "Remote work"], 1, "People who “merely look busy” replace persistent workers."),
      q("price-of-efficiency", 2, "What is the cost of constant interruption?", ["Lower rent", "More meetings", "More mistakes, less insight", "Better tools"], 2, "“Mistakes grow and insight disappears.”"),
      q("price-of-efficiency", 3, "How long to refocus after interruption?", ["Three minutes", "About twenty minutes", "Two hours", "One day"], 1, "“Twenty minutes to fully return.”"),
      q("price-of-efficiency", 4, "What solution is proposed?", ["Longer hours", "Meeting-free deep-work blocks", "More messages", "More managers"], 1, "“Two meeting-free hours each morning.”"),
    ],
  },
  {
    slug: "diverse-city", level: "B2", title: "A Diverse City", minutes: 5,
    vocabFocus: ["diverse", "insight", "controversy", "phenomenon", "acquire", "reluctantly"],
    paragraphs: [
      "Walk through London's East End and you hear a dozen languages before lunch. This diverse mix is no accident: centuries of trade, migration and student life built it. Sociologists call it a living phenomenon.",
      "The benefits are real. Newcomers acquire English fast, and locals gain rare insight into other cultures. Restaurants, music and even humour change. Yet controversy follows too — rents rise, schools fill, and some residents reluctantly admit they miss the old quiet streets.",
      "The city's answer has been pragmatic: fund language classes, celebrate festivals, and build homes near jobs. Diversity, officials argue, is not a problem to solve but a skill to practise.",
    ],
    questions: [
      q("diverse-city", 1, "Why is the East End multilingual?", ["Tourism ads", "Centuries of trade and migration", "A new law", "The weather"], 1, "“Centuries of trade, migration and student life.”"),
      q("diverse-city", 2, "One benefit mentioned is…", ["Lower rents", "Cultural insight", "Quieter streets", "Fewer schools"], 1, "“Rare insight into other cultures.”"),
      q("diverse-city", 3, "One problem mentioned is…", ["Too many festivals", "Rising rents and full schools", "Slow internet", "Cold food"], 1, "“Rents rise, schools fill.”"),
      q("diverse-city", 4, "What is the city's approach?", ["Close borders", "Fund classes and build homes", "Ban festivals", "Move schools away"], 1, "“Fund language classes … build homes near jobs.”"),
    ],
  },
  {
    slug: "paradox-of-choice", level: "C1", title: "The Paradox of Choice", minutes: 6,
    vocabFocus: ["paradox", "pragmatic", "ambiguous", "profoundly", "resilience", "meticulous"],
    paragraphs: [
      "We assume more options mean more freedom. Yet psychologists describe a paradox: beyond a point, choice paralyses. Shoppers faced with thirty jams buy less than those offered six — and enjoy their purchase less.",
      "The cause is not laziness. Each option demands meticulous comparison, and every rejection feels like a loss. Ambiguous criteria make it worse: when we cannot define “best,” we profoundly fear choosing “wrong.”",
      "The pragmatic answer is to satisfice — to pick the option that is good enough and move on. Resilience, in this view, is not enduring hardship but tolerating imperfection. As one researcher puts it, “Choose, commit, and close the tab.”",
    ],
    questions: [
      q("paradox-of-choice", 1, "What is the paradox?", ["More choice → less buying and less joy", "Less choice → more regret", "Choice is always good", "Shoppers hate jam"], 0, "Thirty jams → buy less, enjoy less."),
      q("paradox-of-choice", 2, "Why does comparison hurt?", ["It is too quick", "Every rejection feels like a loss", "Jams are expensive", "Shops are far"], 1, "“Every rejection feels like a loss.”"),
      q("paradox-of-choice", 3, "What makes it worse?", ["Clear prices", "Ambiguous criteria", "Few options", "Honest ads"], 1, "“Ambiguous criteria make it worse.”"),
      q("paradox-of-choice", 4, "What does “satisfice” mean here?", ["Maximise everything", "Pick good enough and move on", "Avoid all choice", "Ask friends always"], 1, "“Pick the option that is good enough.”"),
    ],
  },
  {
    slug: "art-of-resilience", level: "C1", title: "The Art of Resilience", minutes: 6,
    vocabFocus: ["resilience", "eloquent", "meticulous", "serendipity", "exemplify", "deteriorate", "pragmatic", "inevitably"],
    paragraphs: [
      "Resilience is often sold as toughness — grind harder, never break. The research tells a subtler story. Resilient people are not unfeeling; they scrutinize setbacks, name them precisely, and adapt. Their skills do not inevitably deteriorate under stress; they change shape.",
      "Consider the eloquent surgeon who, after a failed operation, spent a year studying errors instead of hiding them. Or the meticulous novelist whose third book flopped, and who called the failure “pure serendipity” — it forced her into a better genre. Both exemplify the same habit: turn data from pain into a plan.",
      "You can train this. Keep a pragmatic log: what happened, what you controlled, what you will try next. Review it weekly. Over months, the log becomes evidence that setbacks end — and that you end them.",
    ],
    questions: [
      q("art-of-resilience", 1, "Resilient people mainly…", ["Ignore feelings", "Analyse setbacks and adapt", "Avoid all risk", "Work longest hours"], 1, "“Scrutinize setbacks … and adapt.”"),
      q("art-of-resilience", 2, "The surgeon example shows…", ["Hiding errors", "Studying errors to improve", "Quitting surgery", "Blaming others"], 1, "“Spent a year studying errors.”"),
      q("art-of-resilience", 3, "Why was the flop “serendipity”?", ["It earned money", "It forced a better genre", "It was expected", "It pleased critics"], 1, "“It forced her into a better genre.”"),
      q("art-of-resilience", 4, "What practice is recommended?", ["A weekly log of events and next steps", "Daily complaining", "Avoiding reviews", "Working alone"], 0, "“Keep a pragmatic log … Review it weekly.”"),
    ],
  },
];

const BY_SLUG = new Map(READING_PASSAGES.map((p) => [p.slug, p]));

export function getReadingPassage(slug: string): ReadingPassage | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function listReadingPassages(level?: string | null): ReadingPassage[] {
  if (!level || level === "all") return READING_PASSAGES;
  return READING_PASSAGES.filter((p) => p.level === level);
}

export function readingWordCount(p: ReadingPassage): number {
  return p.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
}

export function toPublicReadingQuestions(p: ReadingPassage) {
  return p.questions.map((x) => ({ id: x.id, prompt: x.prompt, choices: x.choices }));
}

export const READING_XP_PER_CORRECT = XP_RULES.reading.perCorrect;
export const READING_BONUS_XP = XP_RULES.reading.bonus;

export interface ReadingGrade { score: number; total: number; correctIds: string[]; xpEarned: number; perfect: boolean; }

export function gradeReadingSelections(
  passage: ReadingPassage,
  selections: Array<{ questionId: string; selected: number; choices: string[] }>,
): ReadingGrade {
  let score = 0;
  const correctIds: string[] = [];
  const byId = new Map(passage.questions.map((x) => [x.id, x]));
  for (const s of selections) {
    const x = byId.get(s.questionId);
    if (!x) continue;
    if (Number.isInteger(s.selected) && s.choices[s.selected] === x.choices[x.answer]) {
      score += 1;
      correctIds.push(x.id);
    }
  }
  const total = passage.questions.length;
  const perfect = total > 0 && score === total;
  return { score, total, correctIds, xpEarned: xpForGradedSet(XP_RULES.reading.perCorrect, XP_RULES.reading.bonus, score, total), perfect };
}
