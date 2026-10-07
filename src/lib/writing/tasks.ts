/** Phase 5 — writing task bank. 10 deterministic tasks, 2 per level A1–C1. */
import type { Level } from "@/types/database";

export interface WritingTask {
  slug: string;
  level: Level;
  title: string;
  kind: "email" | "opinion" | "story" | "description" | "review";
  prompt: string;
  minWords: number;
  maxWords: number;
  tips: string[];
  usefulPhrases: string[];
}

export const WRITING_TASKS: WritingTask[] = [
  { slug: "my-day", level: "A1", title: "My Day", kind: "description", prompt: "Write about your typical day. What time do you get up? What do you do in the morning, afternoon and evening?", minWords: 50, maxWords: 120, tips: ["Use present simple (I get up, I eat).", "Write 4–6 short sentences.", "End with one sentence about what you like."], usefulPhrases: ["In the morning", "After that", "In the evening"] },
  { slug: "my-family-email", level: "A1", title: "Email to a Friend", kind: "email", prompt: "Write a short email to a friend. Say hello, describe your family, and invite them to visit you.", minWords: 50, maxWords: 120, tips: ["Start with 'Hi' + name.", "Use 'and' and 'but' to join ideas.", "Finish with a question."], usefulPhrases: ["How are you?", "I live with", "Would you like to"] },
  { slug: "weekend-story", level: "A2", title: "My Weekend", kind: "story", prompt: "Write about what you did last weekend. Where did you go? Who did you see? What did you enjoy?", minWords: 80, maxWords: 160, tips: ["Use past simple (went, saw, enjoyed).", "Use time words: first, then, finally.", "Give one opinion sentence."], usefulPhrases: ["Last weekend", "First,", "It was"] },
  { slug: "favourite-place", level: "A2", title: "My Favourite Place", kind: "description", prompt: "Describe your favourite place in your city. What is there? Why do you like it? What can people do there?", minWords: 80, maxWords: 160, tips: ["Use there is / there are.", "Use adjectives (beautiful, quiet, busy).", "Use because to explain."], usefulPhrases: ["My favourite place is", "There is", "Because"] },
  { slug: "phones-opinion", level: "B1", title: "Phones in Schools", kind: "opinion", prompt: "Should students use phones at school? Give your opinion with two reasons and one example.", minWords: 100, maxWords: 200, tips: ["State your opinion in sentence 1.", "Give reason 1 + example, reason 2 + example.", "Use linking words: however, for example, in my opinion."], usefulPhrases: ["In my opinion", "For example", "On the other hand"] },
  { slug: "film-review", level: "B1", title: "Film Review", kind: "review", prompt: "Write a review of a film you watched recently. Describe the story, the characters, and say who should watch it.", minWords: 100, maxWords: 200, tips: ["Use past tenses for the story.", "Use adjectives for opinion (exciting, boring).", "Finish with a recommendation."], usefulPhrases: ["The film is about", "I liked", "I recommend it to"] },
  { slug: "remote-work", level: "B2", title: "Remote Work Debate", kind: "opinion", prompt: "Is working from home better than working in an office? Discuss both sides and give your own view.", minWords: 140, maxWords: 250, tips: ["One paragraph per side + conclusion.", "Use contrast linkers: although, despite, whereas.", "Hedge opinions: tends to, seems to."], usefulPhrases: ["On the one hand", "Whereas", "In conclusion"] },
  { slug: "complaint-email", level: "B2", title: "Formal Complaint Email", kind: "email", prompt: "You bought headphones online and they arrived broken. Write a formal email: explain the problem, ask for a refund or replacement.", minWords: 120, maxWords: 220, tips: ["Use a formal greeting and closing.", "Be polite but clear: I am writing to…", "State exactly what you want."], usefulPhrases: ["I am writing to complain about", "Unfortunately", "I would be grateful if"] },
  { slug: "ai-society", level: "C1", title: "AI and Society Essay", kind: "opinion", prompt: "Artificial intelligence is changing work and education. To what extent is this a positive development? Argue with nuance.", minWords: 180, maxWords: 300, tips: ["Thesis + two nuanced arguments + counterpoint.", "Use academic hedging: arguably, admittedly, nevertheless.", "Vary sentence length for style."], usefulPhrases: ["Admittedly,", "Nevertheless,", "This essay argues that"] },
  { slug: "city-story", level: "C1", title: "Short Story: The City", kind: "story", prompt: "Write the opening of a short story set in a city at night. Build atmosphere with sensory detail and end on a moment of tension.", minWords: 150, maxWords: 280, tips: ["Show, don't tell: sounds, light, movement.", "Mix simple and complex sentences.", "End with an unresolved moment."], usefulPhrases: ["The streets", "Beneath the", "For a moment"] },
];

export function getWritingTask(slug: string): WritingTask | null {
  return WRITING_TASKS.find((t) => t.slug === slug) ?? null;
}

export function listWritingTasks(level: string): WritingTask[] {
  if (!level || level === "all") return WRITING_TASKS;
  return WRITING_TASKS.filter((t) => t.level === level);
}

export function countWords(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return text.trim() ? words.length : 0;
}
