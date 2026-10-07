/** Phase 4 — deterministic grammar library (no AI). 15 topics, 3 per level A1–C1. */
import type { Level } from "@/types/database";
import { XP_RULES, xpForGradedSet } from "@/lib/gamification/xp-rules";

export interface GrammarQuestion {
  id: string;
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export interface GrammarTopic {
  slug: string;
  level: Level;
  title: string;
  summary: string;
  explanation: string[];
  examples: Array<{ sentence: string; note: string }>;
  questions: GrammarQuestion[];
}

function q(
  topic: string, n: number, prompt: string, choices: string[], answer: number, explanation: string,
): GrammarQuestion {
  return { id: `${topic}-${n}`, prompt, choices, answer, explanation };
}

export const GRAMMAR_TOPICS: GrammarTopic[] = [
  {
    slug: "present-simple", level: "A1", title: "Present Simple",
    summary: "Daily routines, facts and habits: I work, she works.",
    explanation: [
      "Use present simple for habits, routines and general truths: “I eat breakfast at seven.”",
      "Add -s for he/she/it: “She drinks water every morning.” Use do/does for questions and negatives: “Does he learn English?” / “They do not live here.”",
      "Watch spelling: study → studies, watch → watches, have → has (he/she/it).",
    ],
    examples: [
      { sentence: "I learn English every day.", note: "routine (I + base verb)" },
      { sentence: "She quickly finishes her homework.", note: "he/she/it + -es" },
      { sentence: "They do not eat late at night.", note: "negative with do not" },
    ],
    questions: [
      q("present-simple", 1, "She ___ English every day.", ["learn", "learns", "learning", "learned"], 1, "He/she/it takes -s: “She learns.”"),
      q("present-simple", 2, "They ___ breakfast at seven.", ["eats", "eating", "eat", "eaten"], 2, "“They” uses the base verb: “They eat.”"),
      q("present-simple", 3, "___ he live near the school?", ["Do", "Does", "Is", "Has"], 1, "Questions with he/she/it use “Does.”"),
      q("present-simple", 4, "Water ___ at 100°C.", ["boil", "boils", "boiling", "boiled"], 1, "General truths use present simple: “boils.”"),
      q("present-simple", 5, "My family ___ in a big house.", ["live", "lives", "living", "lived"], 1, "“Family” is singular here: “lives.”"),
    ],
  },
  {
    slug: "articles-a-an-the", level: "A1", title: "Articles: a / an / the",
    summary: "When to use a, an, the — or nothing.",
    explanation: [
      "Use a/an for one new thing: “I read a book.” Use an before vowel sounds: “an elephant, an hour.”",
      "Use the when both people know which one: “The book is on the table.”",
      "No article for general plurals: “Families need water.” No article before meals or languages in general: “We eat dinner.”",
    ],
    examples: [
      { sentence: "She saw a bright bird in the garden.", note: "first mention → a; known place → the" },
      { sentence: "An elephant is a big animal.", note: "an before vowel sound" },
      { sentence: "The children were happy at the park.", note: "specific children and park → the" },
    ],
    questions: [
      q("articles-a-an-the", 1, "I read ___ interesting book yesterday.", ["a", "an", "the", "—"], 1, "“Interesting” starts with a vowel sound → an."),
      q("articles-a-an-the", 2, "___ sun is bright today.", ["A", "An", "The", "—"], 2, "There is only one sun → the."),
      q("articles-a-an-the", 3, "She is ___ kind teacher.", ["a", "an", "the", "—"], 0, "First mention, consonant sound → a."),
      q("articles-a-an-the", 4, "___ water is important for health.", ["A", "An", "The", "—"], 3, "General, uncountable → no article."),
      q("articles-a-an-the", 5, "We eat dinner at seven. ___ dinner was good.", ["A", "An", "The", "—"], 2, "Now it is a specific dinner → the."),
    ],
  },
  {
    slug: "plurals-this-that", level: "A1", title: "Plurals, this/that/these/those",
    summary: "book → books, this book → these books.",
    explanation: [
      "Regular plurals add -s: book → books. After s/sh/ch/x add -es: box → boxes, watch → watches.",
      "Consonant + y → -ies: family → families. Common irregulars: child → children, man → men, tooth → teeth.",
      "Use this/that + singular, these/those + plural: “This house is big.” / “Those houses are big.”",
    ],
    examples: [
      { sentence: "These books have many pictures.", note: "these + plural" },
      { sentence: "Those families live near the school.", note: "those + plural noun" },
      { sentence: "This child is happy.", note: "this + singular" },
    ],
    questions: [
      q("plurals-this-that", 1, "One family, two ___.", ["familys", "families", "familyes", "familiem"], 1, "Consonant + y → -ies: families."),
      q("plurals-this-that", 2, "___ books are mine.", ["This", "That", "These", "This one"], 2, "Plural near things → these."),
      q("plurals-this-that", 3, "One child, three ___.", ["childs", "childes", "children", "child"], 2, "Irregular: children."),
      q("plurals-this-that", 4, "___ house over there is big.", ["These", "Those", "That", "They"], 2, "Singular far thing → that."),
      q("plurals-this-that", 5, "She bought two ___ of water.", ["glass", "glasses", "glasss", "glas"], 1, "After s-sounds add -es: glasses."),
    ],
  },
  {
    slug: "past-simple", level: "A2", title: "Past Simple",
    summary: "Finished actions: visited, went, studied.",
    explanation: [
      "Regular verbs add -ed: visit → visited, repair → repaired. Spelling: stop → stopped, study → studied.",
      "Irregular verbs change: go → went, eat → ate, drink → drank, write → wrote.",
      "Questions/negatives use did: “Did you invite them?” / “She did not reply.” The main verb stays in base form.",
    ],
    examples: [
      { sentence: "The journey took three hours.", note: "take → took (irregular)" },
      { sentence: "She replied to my email yesterday.", note: "reply → replied" },
      { sentence: "They did not borrow my pen.", note: "did not + base verb" },
    ],
    questions: [
      q("past-simple", 1, "We ___ to the mountains last week.", ["go", "goed", "went", "gone"], 2, "Go → went in past simple."),
      q("past-simple", 2, "She ___ my bike yesterday.", ["repair", "repaired", "repairs", "repairing"], 1, "Finished action → repaired."),
      q("past-simple", 3, "___ you invite them to dinner?", ["Did", "Do", "Have", "Are"], 0, "Past questions use Did."),
      q("past-simple", 4, "He ___ hard to achieve his dream.", ["study", "studies", "studied", "studying"], 2, "Past context → studied."),
      q("past-simple", 5, "They ___ very happy at the park.", ["were", "was", "are", "been"], 0, "They + past → were."),
    ],
  },
  {
    slug: "comparatives-superlatives", level: "A2", title: "Comparatives & Superlatives",
    summary: "bigger, more careful, the loudest.",
    explanation: [
      "Short adjectives: add -er/-est (big → bigger → biggest; loud → louder → loudest). Double the final consonant after short vowels.",
      "Long adjectives: more/most (careful → more careful → most careful). Irregulars: good → better → best, bad → worse → worst.",
      "Use than after comparatives: “This book is better than that one.” Use the with superlatives: “the bravest firefighter.”",
    ],
    examples: [
      { sentence: "An elephant is bigger than a horse.", note: "-er + than" },
      { sentence: "Reading daily is the best habit.", note: "the + superlative" },
      { sentence: "Drive more carefully in the rain.", note: "more + long adverb" },
    ],
    questions: [
      q("comparatives-superlatives", 1, "This music is ___ than before.", ["loud", "louder", "loudest", "more loud"], 1, "Than → comparative: louder."),
      q("comparatives-superlatives", 2, "She is the ___ student in class.", ["brave", "braver", "bravest", "more brave"], 2, "The + superlative: bravest."),
      q("comparatives-superlatives", 3, "It was the ___ choice of my life.", ["hard", "harder", "hardest", "more hard"], 2, "Superlative: hardest."),
      q("comparatives-superlatives", 4, "This method is ___ efficient.", ["more", "most", "much", "many"], 0, "Long adjective → more efficient."),
      q("comparatives-superlatives", 5, "Today the weather is ___ than yesterday.", ["bad", "worse", "worst", "more bad"], 1, "Irregular: worse than."),
    ],
  },
  {
    slug: "going-to-will", level: "A2", title: "Going to vs Will",
    summary: "Plans vs instant decisions and promises.",
    explanation: [
      "Use going to for plans: “I am going to repair my bike.” Also for visible predictions: “Look — it is going to rain.”",
      "Use will for instant decisions (“I will help you.”), promises (“I will reply today.”) and general predictions (“Weather will improve.”).",
      "Form: will + base verb (no -s, no to). Going to: be + going to + verb.",
    ],
    examples: [
      { sentence: "We are going to walk to school.", note: "plan" },
      { sentence: "I will carry your bag.", note: "instant decision" },
      { sentence: "It will be cold tomorrow.", note: "prediction with will" },
    ],
    questions: [
      q("going-to-will", 1, "Look at the clouds! It ___ rain.", ["will", "is going to", "goes to", "going"], 1, "Visible evidence → going to."),
      q("going-to-will", 2, "— The bag is heavy. — I ___ help you.", ["am going to", "will", "go to", "help"], 1, "Instant decision → will."),
      q("going-to-will", 3, "We ___ visit our family next week. We already bought tickets.", ["will", "are going to", "go", "shall"], 1, "Fixed plan → going to."),
      q("going-to-will", 4, "I promise I ___ late.", ["won't be", "don't be", "am not", "not be"], 0, "Promises use will/won't."),
      q("going-to-will", 5, "She ___ invite us to dinner, she told me yesterday.", ["will", "is going to", "invites", "invited will"], 1, "Prior intention → going to."),
    ],
  },
  {
    slug: "present-perfect", level: "B1", title: "Present Perfect",
    summary: "have done: experience and unfinished time.",
    explanation: [
      "Form: have/has + past participle: “I have visited London.” / “She has improved a lot.”",
      "Use it for life experience (ever/never), recent results (just/already/yet) and unfinished time (this week, today, since Monday).",
      "Past simple = finished time (“I visited Rome in 2020.”). Present perfect = time still open (“I have visited Rome twice.” / “Have you ever tried sushi?”).",
    ],
    examples: [
      { sentence: "Travel has given me valuable experience.", note: "result that matters now" },
      { sentence: "I have never made such a hard decision.", note: "life experience" },
      { sentence: "She has studied English since January.", note: "unfinished period with since" },
    ],
    questions: [
      q("present-perfect", 1, "I have ___ sushi. It was great!", ["try", "tried", "trying", "to try"], 1, "Past participle after have: tried."),
      q("present-perfect", 2, "She ___ just finished her homework.", ["have", "has", "is", "does"], 1, "She → has."),
      q("present-perfect", 3, "We ___ London twice.", ["visited", "have visited", "are visiting", "visits"], 1, "Repeated experience, no finished time → present perfect."),
      q("present-perfect", 4, "I visited Rome ___ 2020.", ["since", "in", "for", "have"], 1, "Finished time marker → in 2020 + past simple."),
      q("present-perfect", 5, "Have you ___ suggested a better plan?", ["ever", "never", "yet already", "since"], 0, "Experience questions use ever."),
    ],
  },
  {
    slug: "conditionals-1-2", level: "B1", title: "Conditionals 1 & 2",
    summary: "If it rains… / If I were you…",
    explanation: [
      "First conditional (real future): If + present simple, will + verb. “If it rains, we will stay home.”",
      "Second conditional (unreal now): If + past simple, would + verb. “If I were rich, I would travel widely.” Always “If I were” (not was) in careful English.",
      "Do not use will/would in the if-clause: not “If it will rain.”",
    ],
    examples: [
      { sentence: "If you practise daily, you will improve fast.", note: "real condition → will" },
      { sentence: "If I were you, I would suggest leaving early.", note: "advice with second conditional" },
      { sentence: "If they invite us, we will come.", note: "present in if-clause" },
    ],
    questions: [
      q("conditionals-1-2", 1, "If it rains, we ___ at home.", ["stay", "will stay", "would stay", "stayed"], 1, "Real future → will stay."),
      q("conditionals-1-2", 2, "If I ___ you, I would study daily.", ["am", "were", "will be", "have been"], 1, "Second conditional uses were."),
      q("conditionals-1-2", 3, "If she works hard, she ___ her goal.", ["would achieve", "will achieve", "achieved", "achieves will"], 1, "First conditional → will achieve."),
      q("conditionals-1-2", 4, "If we ___ earlier, we would not be late.", ["leave", "left", "will leave", "would leave"], 1, "Unreal now → past simple: left."),
      q("conditionals-1-2", 5, "If you heat water, it ___.", ["will boil", "would boil", "boils", "boiled"], 2, "Zero conditional (fact) → present simple."),
    ],
  },
  {
    slug: "passive-basic", level: "B1", title: "Passive Voice (basics)",
    summary: "was built, is spoken, has been repaired.",
    explanation: [
      "Form: be + past participle. “English is widely spoken.” / “The bike was repaired yesterday.”",
      "Use passive when the action matters more than the actor, or the actor is unknown: “My pen was borrowed.”",
      "Keep the tense in be: is cleaned (present), was cleaned (past), will be cleaned (future).",
    ],
    examples: [
      { sentence: "English is widely spoken here.", note: "present passive" },
      { sentence: "The decision was made this morning.", note: "past passive" },
      { sentence: "The results will be announced on Friday.", note: "future passive" },
    ],
    questions: [
      q("passive-basic", 1, "The train was ___.", ["crowd", "crowded", "crowding", "crowds"], 1, "Past participle as adjective: crowded."),
      q("passive-basic", 2, "This course ___ for beginners.", ["designed", "is designed", "designs", "design"], 1, "Present passive: is designed."),
      q("passive-basic", 3, "The email ___ yesterday.", ["sent", "was sent", "is sent", "sends"], 1, "Past passive: was sent."),
      q("passive-basic", 4, "The benefits ___ in the report.", ["explained", "were explained", "explains", "are explain"], 1, "Plural past passive: were explained."),
      q("passive-basic", 5, "The room ___ every day.", ["cleaned", "is cleaned", "cleans", "was clean"], 1, "Routine passive: is cleaned."),
    ],
  },
  {
    slug: "reported-speech", level: "B2", title: "Reported Speech",
    summary: "She said she was tired / had finished.",
    explanation: [
      "When reporting past speech, shift tenses back: present → past (“I am tired” → She said she was tired), past → past perfect (“I finished” → She said she had finished).",
      "Change time words: today → that day, tomorrow → the next day, yesterday → the day before.",
      "Questions become statements with asked/if: “She asked if I was ready.” No question word order: not “asked was I ready.”",
    ],
    examples: [
      { sentence: "He said he would persist.", note: "will → would" },
      { sentence: "She said she had acquired new skills.", note: "past → past perfect" },
      { sentence: "They asked if the train was crowded.", note: "reported yes/no question" },
    ],
    questions: [
      q("reported-speech", 1, "“I am tired.” → She said she ___ tired.", ["is", "was", "will be", "has been"], 1, "Present → past: was."),
      q("reported-speech", 2, "“I finished early.” → He said he ___ early.", ["finished", "had finished", "finishes", "has finished"], 1, "Past → past perfect."),
      q("reported-speech", 3, "She asked me ___ I was ready.", ["if", "that", "what", "do"], 0, "Yes/no reported questions use if/whether."),
      q("reported-speech", 4, "“I will interpret the poem.” → He said he ___ interpret it.", ["will", "would", "shall", "can"], 1, "Will → would."),
      q("reported-speech", 5, "“We met yesterday.” → They said they had met ___.", ["yesterday", "tomorrow", "the day before", "today"], 2, "Yesterday → the day before."),
    ],
  },
  {
    slug: "relative-clauses", level: "B2", title: "Relative Clauses",
    summary: "who, which, that, whose — and when to use commas.",
    explanation: [
      "Use who for people, which for things, that for both (but not after commas). “The friend who helped me is reliable.”",
      "Defining clauses identify which one (no commas): “The book that gave me insight is excellent.” Non-defining clauses add extra info (commas + no that): “London, which is diverse, is huge.”",
      "Whose shows possession: “The writer whose book I borrowed is famous.” Omit the pronoun when it repeats the relative word.",
    ],
    examples: [
      { sentence: "Students who persist improve fast.", note: "defining, no commas" },
      { sentence: "The phenomenon, which scientists study, is rare.", note: "non-defining with commas" },
      { sentence: "He is a friend whose advice I trust.", note: "whose + noun" },
    ],
    questions: [
      q("relative-clauses", 1, "The student ___ asked a great question is curious.", ["which", "who", "whose", "whom that"], 1, "People → who."),
      q("relative-clauses", 2, "The book ___ gave me insight is excellent.", ["who", "that", "whose", "whom"], 1, "Things, defining → that/which."),
      q("relative-clauses", 3, "London, ___ is diverse, attracts millions.", ["that", "which", "who", "whose"], 1, "After a comma, use which (not that)."),
      q("relative-clauses", 4, "She is a writer ___ words are meticulous.", ["who", "which", "whose", "that"], 2, "Possession → whose."),
      q("relative-clauses", 5, "The controversy ___ followed was inevitable.", ["who", "that", "whose", "whom"], 1, "Clause identifies which controversy → that."),
    ],
  },
  {
    slug: "modal-verbs", level: "B2", title: "Modal Verbs",
    summary: "must, have to, should, could, might.",
    explanation: [
      "Must = personal obligation (“I must practise daily.”). Have to = external rule (“We have to wear uniforms.”). Did not need to / need not have done = it was unnecessary.",
      "Should/ought to = advice. Could = past ability or polite possibility; be able to fills gaps (“will be able to”).",
      "Might/may/could + have + participle = past guesses: “He might have missed the train.” Must have + participle = near-certain past conclusion.",
    ],
    examples: [
      { sentence: "You should measure ingredients accurately.", note: "advice" },
      { sentence: "She must have studied hard — her score is perfect.", note: "confident past conclusion" },
      { sentence: "We did not need to hurry; the train was late.", note: "unnecessary action" },
    ],
    questions: [
      q("modal-verbs", 1, "You ___ wear a uniform — it is the rule.", ["must", "have to", "should", "might"], 1, "External rule → have to."),
      q("modal-verbs", 2, "You look tired. You ___ rest.", ["must", "should", "have to", "could have"], 1, "Advice → should."),
      q("modal-verbs", 3, "She ___ the train — she is not here.", ["must miss", "must have missed", "should miss", "has to miss"], 1, "Past conclusion → must have missed."),
      q("modal-verbs", 4, "We ___ hurry; we had plenty of time.", ["must not have hurried", "didn't need to hurry", "shouldn't hurry", "mustn't hurry"], 1, "Unnecessary past action."),
      q("modal-verbs", 5, "When I was young, I ___ acquire languages quickly.", ["can", "could", "must", "should"], 1, "Past ability → could."),
    ],
  },
  {
    slug: "advanced-conditionals", level: "C1", title: "Mixed & Advanced Conditionals",
    summary: "If you had studied… / Had I known…",
    explanation: [
      "Third conditional (past regret): If + past perfect, would have + participle. “If you had persisted, you would have succeeded.”",
      "Mixed conditional (past cause, present result): If + past perfect, would + verb. “If she had slept well, she would feel better now.”",
      "Formal inversion drops if: “Had I known, I would have helped.” / “Should you need help, call me.” Use had/should/were + subject + verb.",
    ],
    examples: [
      { sentence: "If he had scrutinized the contract, he would not have signed it.", note: "third conditional" },
      { sentence: "Had they left earlier, they would be here now.", note: "inversion, mixed meaning" },
      { sentence: "If she had not deteriorated in form, she would be champion now.", note: "mixed conditional" },
    ],
    questions: [
      q("advanced-conditionals", 1, "If you had practised daily, you ___ passed.", ["would have", "would", "will have", "had"], 0, "Past regret → would have passed."),
      q("advanced-conditionals", 2, "___ I known, I would have helped.", ["If", "Had", "Would", "Have"], 1, "Inversion: Had I known."),
      q("advanced-conditionals", 3, "If she had slept well, she ___ better now.", ["would have felt", "would feel", "will feel", "felt"], 1, "Mixed: past cause, present result."),
      q("advanced-conditionals", 4, "If he ___ the contract, he would not have signed.", ["scrutinized", "had scrutinized", "would scrutinize", "scrutinizes"], 1, "Third conditional needs past perfect."),
      q("advanced-conditionals", 5, "___ you need help, call me any time.", ["Had", "Should", "Were", "Would"], 1, "Formal “if” alternative: Should you need."),
    ],
  },
  {
    slug: "participle-clauses", level: "C1", title: "Participle & Reduced Clauses",
    summary: "Having finished… / Scrutinized by experts…",
    explanation: [
      "Present participle (-ing) shows simultaneous or causal action: “Walking home, she practised vocabulary.” Same subject required.",
      "Perfect participle (having + participle) shows an earlier action: “Having acquired the basics, he tackled C1 texts.”",
      "Past participle replaces passive relatives: “The contract (which was) scrutinized by lawyers was fair.” → “Scrutinized by lawyers, the contract was fair.”",
    ],
    examples: [
      { sentence: "Profoundly moved, she exemplified resilience.", note: "past-participle opener" },
      { sentence: "Having finished early, they reviewed their notes.", note: "earlier action first" },
      { sentence: "Being meticulous, good writers check every word.", note: "cause with -ing" },
    ],
    questions: [
      q("participle-clauses", 1, "___ early, they reviewed their notes.", ["Having finished", "Finished", "To finish", "Finish"], 0, "Earlier action → Having finished."),
      q("participle-clauses", 2, "___ by experts, the report was praised.", ["Scrutinizing", "Scrutinized", "To scrutinize", "Scrutinize"], 1, "Passive reduction → past participle."),
      q("participle-clauses", 3, "___ English daily inevitably leads to progress.", ["Study", "Studied", "Studying", "To studying"], 2, "-ing as subject clause."),
      q("participle-clauses", 4, "Walking home, she ___ new words aloud.", ["practising", "practised", "practise", "to practise"], 1, "Main clause keeps its own tense: practised."),
      q("participle-clauses", 5, "___ pragmatic, they chose a simple plan.", ["Been", "Being", "To be", "Be"], 1, "Cause → Being pragmatic."),
    ],
  },
  {
    slug: "cleft-inversion", level: "C1", title: "Cleft Sentences & Inversion",
    summary: "It was Ana who… / Never have I…",
    explanation: [
      "Clefts emphasize one part: “It was daily practice that made her eloquent.” / “What she needed was serendipity.”",
      "Negative inversion: put the auxiliary before the subject after never, rarely, not only, little: “Never have I seen such meticulous work.”",
      "Inversion needs an auxiliary: “Rarely does he deteriorate under pressure.” Do not invert in normal statements.",
    ],
    examples: [
      { sentence: "It was resilience that carried her through C1.", note: "it-cleft" },
      { sentence: "Never had she heard a more eloquent speech.", note: "inversion with past perfect" },
      { sentence: "What he exemplifies is pragmatic leadership.", note: "wh-cleft" },
    ],
    questions: [
      q("cleft-inversion", 1, "It was daily practice ___ made her eloquent.", ["who", "that", "what", "whose"], 1, "It-cleft uses that/who."),
      q("cleft-inversion", 2, "Never ___ such meticulous work.", ["I have seen", "have I seen", "I saw have", "seen I have"], 1, "Inversion: Never have I seen."),
      q("cleft-inversion", 3, "What she needed ___ time, not talent.", ["is", "was", "were", "are"], 1, "Past context → was."),
      q("cleft-inversion", 4, "Rarely ___ deteriorate under pressure.", ["he does", "does he", "he deteriorates", "does"], 1, "Rarely + auxiliary + subject."),
      q("cleft-inversion", 5, "It was serendipity, not planning, that ___ them together.", ["bring", "brought", "brings", "bringing"], 1, "Past event → brought."),
    ],
  },
];

const BY_SLUG = new Map(GRAMMAR_TOPICS.map((t) => [t.slug, t]));

export function getGrammarTopic(slug: string): GrammarTopic | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function listGrammarTopics(level?: string | null): GrammarTopic[] {
  if (!level || level === "all") return GRAMMAR_TOPICS;
  return GRAMMAR_TOPICS.filter((t) => t.level === level);
}

/** Public question shape — answers stay server-side. */
export function toPublicGrammarQuestions(topic: GrammarTopic) {
  return topic.questions.map((x) => ({ id: x.id, prompt: x.prompt, choices: x.choices }));
}

export interface GrammarGrade { score: number; total: number; correctIds: string[]; xpEarned: number; perfect: boolean; }

export const GRAMMAR_XP_PER_CORRECT = XP_RULES.grammar.perCorrect;
export const GRAMMAR_BONUS_XP = XP_RULES.grammar.bonus;

export function gradeGrammar(topic: GrammarTopic, answers: Record<string, number>): GrammarGrade {
  let score = 0;
  const correctIds: string[] = [];
  for (const x of topic.questions) {
    if (answers[x.id] === x.answer) { score += 1; correctIds.push(x.id); }
  }
  const perfect = topic.questions.length > 0 && score === topic.questions.length;
  return { score, total: topic.questions.length, correctIds, xpEarned: xpForGradedSet(XP_RULES.grammar.perCorrect, XP_RULES.grammar.bonus, score, topic.questions.length), perfect };
}

/** Grade {questionId, selected-definition} pairs against the bank without trusting indexes. */
export function gradeGrammarSelections(topic: GrammarTopic, selections: Array<{ questionId: string; selected: number; choices: string[] }>): GrammarGrade {
  let score = 0;
  const correctIds: string[] = [];
  const byId = new Map(topic.questions.map((x) => [x.id, x]));
  for (const s of selections) {
    const x = byId.get(s.questionId);
    if (!x) continue;
    if (Number.isInteger(s.selected) && s.choices[s.selected] === x.choices[x.answer]) {
      score += 1;
      correctIds.push(x.id);
    }
  }
  const total = topic.questions.length;
  const perfect = total > 0 && score === total;
  return { score, total, correctIds, xpEarned: xpForGradedSet(XP_RULES.grammar.perCorrect, XP_RULES.grammar.bonus, score, total), perfect };
}
