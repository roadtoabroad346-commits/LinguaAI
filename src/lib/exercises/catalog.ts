import type { ExerciseDefinition } from "@/lib/exercises/types";

const common = { contentVersion: 1, validationStatus: "validated" as const };

/**
 * A compact, reviewed seed catalogue for the universal runner. Existing lesson
 * libraries remain the source of broad A1–C1 coverage; these exercises prove
 * each reusable interaction without inflating the product with filler.
 */
export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    ...common, id: "articles-specific-reference", level: "A1", skill: "grammar", topic: "articles",
    kind: "multiple-choice", title: "Choose the article", instructions: "Choose the article that refers to a specific place both speakers know.",
    prompt: "Please close ___ window next to you.", difficulty: 1, tags: ["articles", "daily-life"],
    choices: [{ id: "a", label: "a" }, { id: "an", label: "an" }, { id: "the", label: "the" }, { id: "zero", label: "no article" }],
    correctChoiceIds: ["the"], explanation: "Use “the” because “next to you” identifies one specific window.",
  },
  {
    ...common, id: "travel-essential-matching", level: "A1", skill: "vocabulary", topic: "travel",
    kind: "matching", title: "Travel essentials", instructions: "Match each travel word to its meaning.", prompt: "Build three travel pairs.",
    difficulty: 1, tags: ["travel", "nouns"], pairs: [
      { left: "ticket", right: "proof that you paid for a journey" },
      { left: "platform", right: "place where you wait for a train" },
      { left: "luggage", right: "bags you take on a journey" },
    ], explanation: "These words commonly appear together in station and airport instructions.",
  },
  {
    ...common, id: "past-simple-gap", level: "A2", skill: "grammar", topic: "past-simple",
    kind: "fill-blank", title: "Complete the past action", instructions: "Type the correct past form of the verb in brackets.",
    prompt: "We ___ the last bus home. (catch)", difficulty: 2, tags: ["past-simple", "irregular-verbs"],
    acceptedAnswers: ["caught"], explanation: "“Catch” is irregular: catch → caught.",
  },
  {
    ...common, id: "directions-sentence-order", level: "A2", skill: "grammar", topic: "sentence-structure",
    kind: "ordering", title: "Order the directions", instructions: "Put the words in a natural English sentence.",
    prompt: "Build the sentence.", difficulty: 2, tags: ["word-order", "directions"],
    tokens: ["turn", "left", "at", "the", "bank"], correctOrder: ["turn", "left", "at", "the", "bank"],
    explanation: "English imperatives begin with the base verb: “Turn left at the bank.”",
  },
  {
    ...common, id: "present-perfect-error", level: "B1", skill: "grammar", topic: "present-perfect",
    kind: "error-correction", title: "Repair the tense", instructions: "Rewrite the sentence correctly.",
    prompt: "I have seen her yesterday.", difficulty: 3, tags: ["present-perfect", "past-simple"],
    acceptedAnswers: ["I saw her yesterday"], explanation: "A finished time marker such as “yesterday” requires past simple, not present perfect.",
  },
  {
    ...common, id: "too-enough-transformation", level: "B1", skill: "grammar", topic: "transformation",
    kind: "sentence-transformation", title: "Transform with enough", instructions: "Keep the meaning. Use the word “enough”.",
    prompt: "The room is too small for the meeting.", difficulty: 3, tags: ["transformation", "adjectives"],
    acceptedAnswers: ["The room is not big enough for the meeting", "The room isn't big enough for the meeting"],
    explanation: "“Too small” can be transformed to “not big enough” without changing the meaning.",
  },
  {
    ...common, id: "workplace-collocations-select", level: "B1", skill: "vocabulary", topic: "collocations",
    kind: "multiple-select", title: "Natural collocations", instructions: "Select every natural phrase.", prompt: "Which phrases are standard English collocations?",
    difficulty: 3, tags: ["collocations", "work"], choices: [
      { id: "deadline", label: "meet a deadline" }, { id: "decision", label: "make a decision" },
      { id: "homework", label: "do homework" }, { id: "crime", label: "make a crime" },
    ], correctChoiceIds: ["deadline", "decision", "homework"], explanation: "We meet deadlines, make decisions, do homework, and commit a crime.",
  },
  {
    ...common, id: "city-library-inference", level: "B2", skill: "reading", topic: "inference",
    kind: "reading-comprehension", title: "Infer the writer’s view", instructions: "Read the paragraph and choose the conclusion best supported by it.",
    passage: "The old library now stays open until midnight. Attendance has doubled, but the building is no noisier than before. Students say the extra hours let them study around work and family duties.",
    prompt: "What does the writer imply?", difficulty: 4, tags: ["inference", "education"], choices: [
      { id: "a", label: "Longer hours made the library disruptive." }, { id: "b", label: "Flexible access widened useful participation." },
      { id: "c", label: "Most students stopped working." }, { id: "d", label: "The library should close earlier." },
    ], correctChoiceIds: ["b"], explanation: "Higher attendance without more noise, plus access around other duties, supports the idea of useful flexibility.",
  },
  {
    ...common, id: "station-announcement-detail", level: "B2", skill: "listening", topic: "announcements",
    kind: "audio-comprehension", title: "Station announcement", instructions: "Listen, then choose the correct platform.",
    prompt: "Where will the delayed train now depart?", audioText: "Attention please. The delayed service to Bristol will depart from platform fourteen, not platform four as shown on older tickets.",
    difficulty: 3, tags: ["announcement", "detail"], choices: [
      { id: "4", label: "Platform 4" }, { id: "14", label: "Platform 14" }, { id: "40", label: "Platform 40" },
    ], correctChoiceIds: ["14"], explanation: "The correction says “platform fourteen, not platform four.”",
  },
  {
    ...common, id: "weekly-review-dictation", level: "B2", skill: "spelling", topic: "dictation",
    kind: "dictation", title: "Focused dictation", instructions: "Listen and type the complete sentence.", prompt: "Type exactly what you hear.",
    audioText: "Reviewing mistakes regularly makes improvement measurable.", difficulty: 4, tags: ["dictation", "review"],
    acceptedAnswers: ["Reviewing mistakes regularly makes improvement measurable"], explanation: "Check the endings in reviewing, regularly, and measurable.",
  },
  {
    ...common, id: "resilience-short-answer", level: "B2", skill: "reading", topic: "summary",
    kind: "short-answer", title: "One-sentence summary", instructions: "Answer in one short phrase.",
    prompt: "What quality means recovering and adapting after difficulty?", difficulty: 3, tags: ["summary", "abstract-nouns"],
    acceptedAnswers: ["resilience"], explanation: "Resilience is the ability to recover and adapt after setbacks.",
  },
  {
    ...common, id: "nuanced-recommendation-review", level: "C1", skill: "grammar", topic: "mixed-review",
    kind: "mixed-skill-review", title: "Nuanced recommendation", instructions: "Choose the grammatically accurate and appropriately cautious sentence.",
    prompt: "Which sentence best suits a formal report?", difficulty: 5, tags: ["hedging", "register"], choices: [
      { id: "a", label: "This definitely fixes every problem." },
      { id: "b", label: "The evidence suggests that the measure may reduce delays." },
      { id: "c", label: "The measure maybe reducing all delays." },
    ], correctChoiceIds: ["b"], explanation: "“The evidence suggests” plus “may” makes a precise, grammatical, appropriately hedged claim.",
  },
  {
    ...common, id: "meticulous-flashcard", level: "C1", skill: "vocabulary", topic: "academic-vocabulary",
    kind: "flashcard", title: "Academic flashcard", instructions: "Recall the meaning, reveal it, then grade your memory honestly.",
    prompt: "Do you know this word?", difficulty: 4, tags: ["academic", "spaced-repetition"],
    flashcard: { front: "meticulous", back: "very careful and precise; attentive to detail" },
    explanation: "Use “meticulous” for careful work: “She kept meticulous records.”",
  },
  {
    ...common, id: "formal-summary-writing", level: "C1", skill: "writing", topic: "summary",
    kind: "long-form-writing", title: "Write a balanced summary", instructions: "Write 120–160 words. Include the claim, evidence, limitation, and implication.",
    prompt: "Summarize an argument about whether flexible working improves productivity. Do not add unsupported facts.", difficulty: 5, tags: ["summary", "formal-register"],
    rubric: { requiresReview: true, criteria: [
      { id: "coverage", label: "Covers claim, evidence, limitation and implication", maxPoints: 40 },
      { id: "accuracy", label: "Does not invent evidence", maxPoints: 25 },
      { id: "cohesion", label: "Uses clear logical connections", maxPoints: 20 },
      { id: "language", label: "Uses accurate formal English", maxPoints: 15 },
    ] }, explanation: "This response needs rubric-based feedback; LinguaAI will not fabricate an objective score.",
  },
  {
    ...common, id: "contrast-stress-recording", level: "C1", skill: "pronunciation", topic: "sentence-stress",
    kind: "pronunciation-practice", title: "Contrast stress", instructions: "Listen, record yourself, and compare which word carries the correction.",
    prompt: "I said THURSDAY, not Tuesday.", audioText: "I said Thursday, not Tuesday.", difficulty: 4, tags: ["stress", "recording"],
    rubric: { requiresReview: true, criteria: [
      { id: "stress", label: "Thursday carries the main stress", maxPoints: 60 },
      { id: "clarity", label: "Words remain clear and intelligible", maxPoints: 40 },
    ] }, explanation: "Reference audio supports comparison, but TTS alone cannot assess your pronunciation.",
  },
  {
    ...common, id: "structured-opinion-recording", level: "C1", skill: "speaking", topic: "opinions",
    kind: "voice-recording", title: "Structured opinion", instructions: "Record 60–90 seconds: position, reason, example, counterpoint, conclusion.",
    prompt: "Should cities restrict private cars in their centres?", difficulty: 5, tags: ["fluency", "argument"],
    rubric: { requiresReview: true, criteria: [
      { id: "structure", label: "Clear five-part structure", maxPoints: 35 },
      { id: "support", label: "Relevant reason and example", maxPoints: 30 },
      { id: "range", label: "Appropriate range of vocabulary and grammar", maxPoints: 20 },
      { id: "delivery", label: "Understandable delivery", maxPoints: 15 },
    ] }, explanation: "A recording requires human or supported speech review; recording alone is never treated as a pronunciation score.",
  },
  {
    ...common, validationStatus: "pilot", id: "c2-policy-synthesis", level: "C2", skill: "writing", topic: "synthesis",
    kind: "long-form-writing", title: "Policy synthesis (pilot)", instructions: "Write a 220–280 word synthesis that reconciles competing principles without flattening their differences.",
    prompt: "Synthesize the tensions between transparency, privacy, and accountability in automated public decisions.", difficulty: 5, tags: ["c2-pilot", "synthesis"],
    rubric: { requiresReview: true, criteria: [
      { id: "synthesis", label: "Integrates rather than merely lists positions", maxPoints: 40 },
      { id: "precision", label: "Uses precise distinctions and qualifications", maxPoints: 30 },
      { id: "cohesion", label: "Sustains a coherent line of reasoning", maxPoints: 20 },
      { id: "control", label: "Shows flexible, accurate language control", maxPoints: 10 },
    ] }, explanation: "This is explicitly pilot C2 content and does not establish validated C2 pathway coverage.",
  },
];

const BY_VERSION = new Map(EXERCISE_CATALOG.map((exercise) => [`${exercise.id}@${exercise.contentVersion}`, exercise]));

export function getExercise(id: string, version = 1): ExerciseDefinition | null {
  return BY_VERSION.get(`${id}@${version}`) ?? null;
}

export function listValidatedExercises(filters: { level?: string; skill?: string; topic?: string } = {}): ExerciseDefinition[] {
  return EXERCISE_CATALOG.filter((exercise) => {
    if (exercise.validationStatus !== "validated") return false;
    if (filters.level && exercise.level !== filters.level) return false;
    if (filters.skill && exercise.skill !== filters.skill) return false;
    if (filters.topic && exercise.topic !== filters.topic) return false;
    return true;
  });
}
