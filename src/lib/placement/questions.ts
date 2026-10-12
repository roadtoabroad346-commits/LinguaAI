import type { Level } from "@/lib/constants";

export interface PlacementQuestion {
  id: string;
  level: Level;
  prompt: string;
  options: [string, string, string, string];
  /** index of the correct option (0–3) */
  answer: number;
  /** grammar/vocab topic, e.g. "Present Simple". Shown in the mistake review. */
  topic: string;
  /** one-line rule explaining the correct answer. English: it is learning content. */
  explanation: string;
}

/**
 * Deterministic 20-question placement bank: 4 items per CEFR band, ordered easy → hard.
 * Grammar + vocabulary, no AI needed. Keep stable IDs so saved answers stay comparable.
 */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // A1
  { id: "a1-1", level: "A1", prompt: 'She ___ a student.', options: ["am", "is", "are", "be"], answer: 1, topic: "Verb to be", explanation: "Use “is” with he/she/it: “She is a student.”" },
  { id: "a1-2", level: "A1", prompt: 'I ___ coffee every morning.', options: ["drinks", "drink", "drinking", "dranked"], answer: 1, topic: "Present Simple", explanation: "With I/you/we/they use the base verb: “I drink coffee.” “Drinks” is only for he/she/it." },
  { id: "a1-3", level: "A1", prompt: 'There ___ two books on the table.', options: ["is", "are", "am", "be"], answer: 1, topic: "There is / are", explanation: "Plural noun (“two books”) needs “there are”." },
  { id: "a1-4", level: "A1", prompt: 'He ___ TV now.', options: ["watch", "watches", "is watching", "watching"], answer: 2, topic: "Present Continuous", explanation: "“Now” signals an action in progress: “is + verb-ing” → “is watching”." },
  // A2
  { id: "a2-1", level: "A2", prompt: 'We ___ to London last year.', options: ["go", "went", "goed", "going"], answer: 1, topic: "Past Simple", explanation: "“Last year” needs Past Simple. “Go” is irregular: go → went (never “goed”)." },
  { id: "a2-2", level: "A2", prompt: 'This phone is ___ than mine.', options: ["good", "gooder", "better", "best"], answer: 2, topic: "Comparatives", explanation: "“Good” is irregular: good → better → best. “Than” needs the comparative: “better”." },
  { id: "a2-3", level: "A2", prompt: 'I have lived here ___ 2019.', options: ["for", "since", "from", "at"], answer: 1, topic: "For / Since", explanation: "“Since” + starting point (2019); “for” + duration (“for five years”)." },
  { id: "a2-4", level: "A2", prompt: 'If it rains, we ___ at home.', options: ["stay", "will stay", "would stay", "stayed"], answer: 1, topic: "First Conditional", explanation: "Real future condition: If + Present Simple, will + verb → “will stay”." },
  // B1
  { id: "b1-1", level: "B1", prompt: 'The report ___ by the manager yesterday.', options: ["wrote", "was written", "is written", "has wrote"], answer: 1, topic: "Passive Voice", explanation: "Past passive: was/were + past participle → “was written”. “Yesterday” rules out present forms." },
  { id: "b1-2", level: "B1", prompt: 'I look forward ___ from you soon.', options: ["to hear", "to hearing", "hear", "hearing"], answer: 1, topic: "Gerund after preposition", explanation: "After “look forward to”, “to” is a preposition, so a gerund follows: “to hearing”." },
  { id: "b1-3", level: "B1", prompt: 'She has been working here ___ five years.', options: ["since", "for", "during", "from"], answer: 1, topic: "For / Since", explanation: "Duration (“five years”) needs “for”. “Since” is for starting points." },
  { id: "b1-4", level: "B1", prompt: 'You ___ wear a uniform; it is optional.', options: ["must", "have to", "don’t have to", "should to"], answer: 2, topic: "Modals: obligation", explanation: "“Optional” = no obligation → “don’t have to”. “Must” would mean it is required." },
  // B2
  { id: "b2-1", level: "B2", prompt: 'Had I known, I ___ helped you.', options: ["will have", "would have", "have", "had"], answer: 1, topic: "Third Conditional", explanation: "Past regret: Had + past participle … would have + past participle → “would have helped”." },
  { id: "b2-2", level: "B2", prompt: 'The meeting was ___ until Friday.', options: ["put off", "put on", "put up", "put out"], answer: 0, topic: "Phrasal verbs", explanation: "“Put off” = postpone. “Put on” = wear/organize, “put out” = extinguish." },
  { id: "b2-3", level: "B2", prompt: 'Scarcely ___ arrived when it started to rain.', options: ["we had", "had we", "we have", "have we"], answer: 1, topic: "Inversion", explanation: "After negative adverbs (scarcely/hardly/never) the order inverts: “Scarcely had we arrived…”" },
  { id: "b2-4", level: "B2", prompt: 'His argument is hardly ___.', options: ["convincing enough", "enough convincing", "convince", "too convincing"], answer: 0, topic: "Enough placement", explanation: "“Enough” goes after adjectives: “convincing enough”. Before nouns: “enough time”." },
  // C1
  { id: "c1-1", level: "C1", prompt: '___ the evidence, the claim remains unsubstantiated.', options: ["Notwithstanding", "Despite of", "Although of", "In spite"], answer: 0, topic: "Concessive phrases", explanation: "“Notwithstanding” (+ noun) is correct. “Despite” never takes “of”; “in spite” needs “of” (“in spite of”)." },
  { id: "c1-2", level: "C1", prompt: 'She is ___ to criticism after the scandal.', options: ["impervious", "imperative", "impertinent", "importunate"], answer: 0, topic: "Advanced vocabulary", explanation: "“Impervious to” = unaffected by. The others mean urgent, rude, and persistent." },
  { id: "c1-3", level: "C1", prompt: 'The negotiations reached an ___.', options: ["impasse", "impass", "impassable", "passage"], answer: 0, topic: "Advanced vocabulary", explanation: "“Impasse” = deadlock. “Impassable” is an adjective (a road), “passage” is a corridor or text extract." },
  { id: "c1-4", level: "C1", prompt: 'He speaks English with remarkable ___.', options: ["fluency", "fluidity", "fluentness", "flow"], answer: 0, topic: "Word formation", explanation: "Speaking a language well = “fluency”. “Fluidity” is about liquids or smooth movement in general." },
];

export const PLACEMENT_TOTAL = PLACEMENT_QUESTIONS.length;
