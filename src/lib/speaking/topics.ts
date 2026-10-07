/** Phase 6 — Topic Talk bank. 10 deterministic topics, 2 per level A1–C1. */
import type { Level } from "@/types/database";

export interface SpeakingTopic {
  slug: string;
  level: Level;
  title: string;
  prompt: string;
  questions: string[];
  minWords: number;
  targetSecs: number;
  usefulPhrases: string[];
}

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  { slug: "my-morning", level: "A1", title: "My Morning", prompt: "Talk for about 30 seconds about your morning routine.", questions: ["What time do you get up?", "What do you eat for breakfast?", "What do you like about mornings?"], minWords: 25, targetSecs: 30, usefulPhrases: ["I get up at", "After that", "I like"] },
  { slug: "my-best-friend", level: "A1", title: "My Best Friend", prompt: "Talk for about 30 seconds about your best friend.", questions: ["What is their name?", "What do they look like?", "What do you do together?"], minWords: 25, targetSecs: 30, usefulPhrases: ["He is / She is", "We like to", "He has / She has"] },
  { slug: "last-weekend", level: "A2", title: "Last Weekend", prompt: "Talk for about 45 seconds about what you did last weekend.", questions: ["Where did you go?", "Who did you see?", "What did you enjoy most?"], minWords: 45, targetSecs: 45, usefulPhrases: ["Last weekend", "First, … then", "It was"] },
  { slug: "my-city", level: "A2", title: "My City", prompt: "Talk for about 45 seconds describing your city or town.", questions: ["Where do you live?", "What is beautiful or interesting there?", "Where should a visitor go?"], minWords: 45, targetSecs: 45, usefulPhrases: ["There is / There are", "It is famous for", "You should visit"] },
  { slug: "phones-at-school", level: "B1", title: "Phones at School", prompt: "Talk for 1 minute: should students use phones at school? Give your opinion with reasons.", questions: ["What is your opinion?", "Give one reason and one example.", "What do others say?"], minWords: 80, targetSecs: 60, usefulPhrases: ["In my opinion", "For example", "On the other hand"] },
  { slug: "dream-holiday", level: "B1", title: "Dream Holiday", prompt: "Talk for 1 minute about your dream holiday: where, with whom, what you would do.", questions: ["Where would you go?", "Who would you go with?", "What would you do there?"], minWords: 80, targetSecs: 60, usefulPhrases: ["I would love to", "I would visit", "It would be"] },
  { slug: "remote-work", level: "B2", title: "Remote Work", prompt: "Talk for 90 seconds: is working from home better than the office? Discuss both sides.", questions: ["What is good about remote work?", "What is good about the office?", "What is your conclusion?"], minWords: 120, targetSecs: 90, usefulPhrases: ["On the one hand", "Whereas", "In conclusion"] },
  { slug: "learning-english", level: "B2", title: "Learning English", prompt: "Talk for 90 seconds about your English learning: methods, problems, goals.", questions: ["How do you practise?", "What is hardest for you?", "What is your goal this month?"], minWords: 120, targetSecs: 90, usefulPhrases: ["I find … difficult", "What helps me is", "My goal is to"] },
  { slug: "ai-and-jobs", level: "C1", title: "AI and Jobs", prompt: "Talk for 2 minutes: is AI changing work for the better? Argue with nuance.", questions: ["What is one benefit?", "What is one risk?", "What is your balanced view?"], minWords: 160, targetSecs: 120, usefulPhrases: ["Admittedly,", "Nevertheless,", "On balance"] },
  { slug: "story-night-bus", level: "C1", title: "Story: Night Bus", prompt: "Tell a 2-minute story: a night bus, a stranger, an unexpected stop.", questions: ["Set the scene — where and when?", "Who appears?", "How does it end?"], minWords: 160, targetSecs: 120, usefulPhrases: ["It was late when", "All of a sudden", "In the end"] },
];

export function getSpeakingTopic(slug: string): SpeakingTopic | null {
  return SPEAKING_TOPICS.find((t) => t.slug === slug) ?? null;
}

export function listSpeakingTopics(level: string): SpeakingTopic[] {
  if (!level || level === "all") return SPEAKING_TOPICS;
  return SPEAKING_TOPICS.filter((t) => t.level === level);
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}
