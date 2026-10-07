/** Phase 6 — read-aloud passage bank. 8 passages across A1–C1. */
import type { Level } from "@/types/database";

export interface ReadAloudPassage {
  slug: string;
  level: Level;
  title: string;
  text: string;
  focus: string;
}

export const READ_ALOUD_PASSAGES: ReadAloudPassage[] = [
  { slug: "morning-coffee", level: "A1", title: "Morning Coffee", focus: "present simple, short sentences", text: "I wake up at seven o'clock. I wash my face and make coffee. The coffee is hot and strong. I drink it slowly and look out of the window. Birds sing in the tree. I feel calm and ready for the day." },
  { slug: "city-park", level: "A1", title: "The City Park", focus: "there is / adjectives", text: "There is a small park near my house. There are tall trees and green grass. Children play football there in the afternoon. Old people sit on benches and talk. I like to walk there in the evening." },
  { slug: "rainy-trip", level: "A2", title: "A Rainy Trip", focus: "past simple, time words", text: "Last Saturday we went to the lake. First, the sun was bright and warm. Then dark clouds came, and it started to rain. We ran to a small café and drank hot tea. Finally, the rain stopped, and we saw a rainbow over the water." },
  { slug: "market-day", level: "A2", title: "Market Day", focus: "descriptions, prices", text: "The market opens early every Sunday. Farmers sell fresh apples, cheese, and bread. The apples are red and sweet. A kilo costs two euros. People ask questions, taste the food, and smile. I always buy bread and talk to the baker." },
  { slug: "phones-debate", level: "B1", title: "Phones in Class", focus: "opinion, linkers", text: "In my opinion, phones can help students learn. For example, they can look up new words in seconds. However, phones can also distract the class. Messages pop up, and attention disappears. On the other hand, clear rules can solve this problem. Used wisely, a phone is a tool, not a toy." },
  { slug: "night-train", level: "B1", title: "The Night Train", focus: "narrative past, atmosphere", text: "The night train left the station at eleven. Lights moved past the window like fallen stars. A woman slept with a book on her lap. Outside, the fields were dark and silent. I listened to the wheels and thought about the city waiting for me in the morning." },
  { slug: "remote-work-b2", level: "B2", title: "Working from Home", focus: "contrast linkers, formal tone", text: "Working from home saves time and money, whereas commuting steals both. Although remote workers enjoy freedom, they may miss daily contact with colleagues. Despite these problems, many companies report higher productivity. In conclusion, the best model may be a mix: some days at home, some days together." },
  { slug: "city-lights-c1", level: "C1", title: "City Lights", focus: "literary rhythm, varied sentences", text: "Beneath the rain, the city shone like a broken mirror. Neon signs trembled on wet stone, and buses sighed at empty stops. Admittedly, the night was cold, yet it felt alive. A stranger laughed somewhere above the traffic. For a moment, every window seemed to hold a small, unfinished story." },
];

export function getReadAloudPassage(slug: string): ReadAloudPassage | null {
  return READ_ALOUD_PASSAGES.find((p) => p.slug === slug) ?? null;
}

export function listReadAloudPassages(level: string): ReadAloudPassage[] {
  if (!level || level === "all") return READ_ALOUD_PASSAGES;
  return READ_ALOUD_PASSAGES.filter((p) => p.level === level);
}

export function countPassageWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}
