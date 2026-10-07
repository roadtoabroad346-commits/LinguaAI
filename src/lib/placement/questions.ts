import type { Level } from "@/lib/constants";

export interface PlacementQuestion {
  id: string;
  level: Level;
  prompt: string;
  options: [string, string, string, string];
  /** index of the correct option (0–3) */
  answer: number;
}

/**
 * Deterministic 20-question placement bank: 4 items per CEFR band, ordered easy → hard.
 * Grammar + vocabulary, no AI needed. Keep stable IDs so saved answers stay comparable.
 */
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // A1
  { id: "a1-1", level: "A1", prompt: 'She ___ a student.', options: ["am", "is", "are", "be"], answer: 1 },
  { id: "a1-2", level: "A1", prompt: 'I ___ coffee every morning.', options: ["drinks", "drink", "drinking", "dranked"], answer: 1 },
  { id: "a1-3", level: "A1", prompt: 'There ___ two books on the table.', options: ["is", "are", "am", "be"], answer: 1 },
  { id: "a1-4", level: "A1", prompt: 'He ___ TV now.', options: ["watch", "watches", "is watching", "watching"], answer: 2 },
  // A2
  { id: "a2-1", level: "A2", prompt: 'We ___ to London last year.', options: ["go", "went", "goed", "going"], answer: 1 },
  { id: "a2-2", level: "A2", prompt: 'This phone is ___ than mine.', options: ["good", "gooder", "better", "best"], answer: 2 },
  { id: "a2-3", level: "A2", prompt: 'I have lived here ___ 2019.', options: ["for", "since", "from", "at"], answer: 1 },
  { id: "a2-4", level: "A2", prompt: 'If it rains, we ___ at home.', options: ["stay", "will stay", "would stay", "stayed"], answer: 1 },
  // B1
  { id: "b1-1", level: "B1", prompt: 'The report ___ by the manager yesterday.', options: ["wrote", "was written", "is written", "has wrote"], answer: 1 },
  { id: "b1-2", level: "B1", prompt: 'I look forward ___ from you soon.', options: ["to hear", "to hearing", "hear", "hearing"], answer: 1 },
  { id: "b1-3", level: "B1", prompt: 'She has been working here ___ five years.', options: ["since", "for", "during", "from"], answer: 1 },
  { id: "b1-4", level: "B1", prompt: 'You ___ wear a uniform; it is optional.', options: ["must", "have to", "don’t have to", "should to"], answer: 2 },
  // B2
  { id: "b2-1", level: "B2", prompt: 'Had I known, I ___ helped you.', options: ["will have", "would have", "have", "had"], answer: 1 },
  { id: "b2-2", level: "B2", prompt: 'The meeting was ___ until Friday.', options: ["put off", "put on", "put up", "put out"], answer: 0 },
  { id: "b2-3", level: "B2", prompt: 'Scarcely ___ arrived when it started to rain.', options: ["we had", "had we", "we have", "have we"], answer: 1 },
  { id: "b2-4", level: "B2", prompt: 'His argument is hardly ___.', options: ["convincing enough", "enough convincing", "convince", "too convincing"], answer: 0 },
  // C1
  { id: "c1-1", level: "C1", prompt: '___ the evidence, the claim remains unsubstantiated.', options: ["Notwithstanding", "Despite of", "Although of", "In spite"], answer: 0 },
  { id: "c1-2", level: "C1", prompt: 'She is ___ to criticism after the scandal.', options: ["impervious", "imperative", "impertinent", "importunate"], answer: 0 },
  { id: "c1-3", level: "C1", prompt: 'The negotiations reached an ___.', options: ["impasse", "impass", "impassable", "passage"], answer: 0 },
  { id: "c1-4", level: "C1", prompt: 'He speaks English with remarkable ___.', options: ["fluency", "fluidity", "fluentness", "flow"], answer: 0 },
];

export const PLACEMENT_TOTAL = PLACEMENT_QUESTIONS.length;
