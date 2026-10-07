/** Phase 3 — deterministic vocabulary bank (no AI, no I/O). 60 words, 12 per level A1–C1. */
import type { Level } from "@/types/database";

export interface VocabWord {
  slug: string;
  word: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb";
  level: Level;
  definition: string;
  example: string;
  phonetic: string;
}

export const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb"] as const;

export const VOCAB_BANK: VocabWord[] = [
  // A1
  { slug: "bright", word: "bright", partOfSpeech: "adjective", level: "A1", definition: "giving out light; intelligent", example: "The bright sun woke us up early.", phonetic: "/braɪt/" },
  { slug: "journey", word: "journey", partOfSpeech: "noun", level: "A1", definition: "travelling from one place to another", example: "The journey to the mountains took three hours.", phonetic: "/ˈdʒɜːrni/" },
  { slug: "kind", word: "kind", partOfSpeech: "adjective", level: "A1", definition: "friendly and helpful", example: "She is kind to new students.", phonetic: "/kaɪnd/" },
  { slug: "family", word: "family", partOfSpeech: "noun", level: "A1", definition: "a group of people related to each other", example: "My family lives in a small town.", phonetic: "/ˈfæməli/" },
  { slug: "water", word: "water", partOfSpeech: "noun", level: "A1", definition: "the clear liquid we drink", example: "Drink a glass of water every morning.", phonetic: "/ˈwɔːtər/" },
  { slug: "happy", word: "happy", partOfSpeech: "adjective", level: "A1", definition: "feeling good and pleased", example: "The children were happy at the park.", phonetic: "/ˈhæpi/" },
  { slug: "eat", word: "eat", partOfSpeech: "verb", level: "A1", definition: "to put food in your mouth", example: "We eat dinner at seven.", phonetic: "/iːt/" },
  { slug: "book", word: "book", partOfSpeech: "noun", level: "A1", definition: "pages with words that you read", example: "This book has many pictures.", phonetic: "/bʊk/" },
  { slug: "quickly", word: "quickly", partOfSpeech: "adverb", level: "A1", definition: "at a fast speed", example: "She quickly finished her homework.", phonetic: "/ˈkwɪkli/" },
  { slug: "house", word: "house", partOfSpeech: "noun", level: "A1", definition: "a building where people live", example: "Their house is near the school.", phonetic: "/haʊs/" },
  { slug: "learn", word: "learn", partOfSpeech: "verb", level: "A1", definition: "to get new knowledge or a skill", example: "I want to learn English.", phonetic: "/lɜːrn/" },
  { slug: "big", word: "big", partOfSpeech: "adjective", level: "A1", definition: "large in size", example: "An elephant is a big animal.", phonetic: "/bɪɡ/" },
  // A2
  { slug: "achieve", word: "achieve", partOfSpeech: "verb", level: "A2", definition: "to reach a goal", example: "He studied hard to achieve his dream.", phonetic: "/əˈtʃiːv/" },
  { slug: "brave", word: "brave", partOfSpeech: "adjective", level: "A2", definition: "not afraid of danger", example: "The brave firefighter saved the cat.", phonetic: "/breɪv/" },
  { slug: "habit", word: "habit", partOfSpeech: "noun", level: "A2", definition: "something you do regularly", example: "Reading every day is a good habit.", phonetic: "/ˈhæbɪt/" },
  { slug: "borrow", word: "borrow", partOfSpeech: "verb", level: "A2", definition: "to take something and return it later", example: "Can I borrow your pen?", phonetic: "/ˈbɒroʊ/" },
  { slug: "weather", word: "weather", partOfSpeech: "noun", level: "A2", definition: "the state of the air outside (rain, sun, wind)", example: "The weather is cold today.", phonetic: "/ˈweðər/" },
  { slug: "carefully", word: "carefully", partOfSpeech: "adverb", level: "A2", definition: "with attention to avoid mistakes", example: "Drive carefully in the rain.", phonetic: "/ˈkeərfəli/" },
  { slug: "invite", word: "invite", partOfSpeech: "verb", level: "A2", definition: "to ask someone to come", example: "They invited us to dinner.", phonetic: "/ɪnˈvaɪt/" },
  { slug: "loud", word: "loud", partOfSpeech: "adjective", level: "A2", definition: "making a lot of noise", example: "The music is too loud.", phonetic: "/laʊd/" },
  { slug: "reply", word: "reply", partOfSpeech: "verb", level: "A2", definition: "to answer a message or question", example: "She replied to my email yesterday.", phonetic: "/rɪˈplaɪ/" },
  { slug: "choice", word: "choice", partOfSpeech: "noun", level: "A2", definition: "something you choose between options", example: "It was a difficult choice.", phonetic: "/tʃɔɪs/" },
  { slug: "often", word: "often", partOfSpeech: "adverb", level: "A2", definition: "many times", example: "We often walk to school.", phonetic: "/ˈɒfən/" },
  { slug: "repair", word: "repair", partOfSpeech: "verb", level: "A2", definition: "to fix something broken", example: "He repaired my bike.", phonetic: "/rɪˈpeər/" },
  // B1
  { slug: "curious", word: "curious", partOfSpeech: "adjective", level: "B1", definition: "wanting to learn new things", example: "Curious students ask great questions.", phonetic: "/ˈkjʊəriəs/" },
  { slug: "opportunity", word: "opportunity", partOfSpeech: "noun", level: "B1", definition: "a chance to do something", example: "This course is a great opportunity to improve.", phonetic: "/ˌɒpərˈtuːnəti/" },
  { slug: "reliable", word: "reliable", partOfSpeech: "adjective", level: "B1", definition: "someone you can trust", example: "He is a reliable friend.", phonetic: "/rɪˈlaɪəbəl/" },
  { slug: "improve", word: "improve", partOfSpeech: "verb", level: "B1", definition: "to make something better", example: "Daily practice will improve your speaking.", phonetic: "/ɪmˈpruːv/" },
  { slug: "experience", word: "experience", partOfSpeech: "noun", level: "B1", definition: "knowledge from doing things", example: "Travel gives you valuable experience.", phonetic: "/ɪkˈspɪəriəns/" },
  { slug: "suddenly", word: "suddenly", partOfSpeech: "adverb", level: "B1", definition: "quickly and without warning", example: "It suddenly started to rain.", phonetic: "/ˈsʌdənli/" },
  { slug: "suggest", word: "suggest", partOfSpeech: "verb", level: "B1", definition: "to offer an idea", example: "I suggest we leave early.", phonetic: "/səˈdʒest/" },
  { slug: "crowded", word: "crowded", partOfSpeech: "adjective", level: "B1", definition: "full of people", example: "The train was crowded this morning.", phonetic: "/ˈkraʊdɪd/" },
  { slug: "decision", word: "decision", partOfSpeech: "noun", level: "B1", definition: "a choice you make after thinking", example: "It was a hard decision to move.", phonetic: "/dɪˈsɪʒən/" },
  { slug: "expect", word: "expect", partOfSpeech: "verb", level: "B1", definition: "to think something will happen", example: "We expect the results on Friday.", phonetic: "/ɪkˈspekt/" },
  { slug: "widely", word: "widely", partOfSpeech: "adverb", level: "B1", definition: "in many places or by many people", example: "English is widely spoken.", phonetic: "/ˈwaɪdli/" },
  { slug: "benefit", word: "benefit", partOfSpeech: "noun", level: "B1", definition: "a good or helpful result", example: "Exercise has many benefits.", phonetic: "/ˈbenɪfɪt/" },
  // B2
  { slug: "efficient", word: "efficient", partOfSpeech: "adjective", level: "B2", definition: "working well without wasting time", example: "A short daily routine is very efficient.", phonetic: "/ɪˈfɪʃənt/" },
  { slug: "insight", word: "insight", partOfSpeech: "noun", level: "B2", definition: "a clear understanding of something", example: "The book gave me new insight into history.", phonetic: "/ˈɪnsaɪt/" },
  { slug: "persist", word: "persist", partOfSpeech: "verb", level: "B2", definition: "to continue trying despite problems", example: "If you persist, your English will improve fast.", phonetic: "/pərˈsɪst/" },
  { slug: "diverse", word: "diverse", partOfSpeech: "adjective", level: "B2", definition: "including many different types", example: "London is a diverse city.", phonetic: "/daɪˈvɜːrs/" },
  { slug: "consequence", word: "consequence", partOfSpeech: "noun", level: "B2", definition: "a result of an action", example: "Every choice has a consequence.", phonetic: "/ˈkɒnsɪkwəns/" },
  { slug: "accurately", word: "accurately", partOfSpeech: "adverb", level: "B2", definition: "correctly and exactly", example: "Measure the ingredients accurately.", phonetic: "/ˈækjərətli/" },
  { slug: "interpret", word: "interpret", partOfSpeech: "verb", level: "B2", definition: "to explain the meaning of something", example: "How do you interpret this poem?", phonetic: "/ɪnˈtɜːrprət/" },
  { slug: "inevitable", word: "inevitable", partOfSpeech: "adjective", level: "B2", definition: "certain to happen", example: "Mistakes are inevitable when learning.", phonetic: "/ɪnˈevɪtəbəl/" },
  { slug: "phenomenon", word: "phenomenon", partOfSpeech: "noun", level: "B2", definition: "something that happens and can be observed", example: "Rainbows are a natural phenomenon.", phonetic: "/fəˈnɒmɪnən/" },
  { slug: "acquire", word: "acquire", partOfSpeech: "verb", level: "B2", definition: "to get or learn something", example: "Children acquire language quickly.", phonetic: "/əˈkwaɪər/" },
  { slug: "reluctantly", word: "reluctantly", partOfSpeech: "adverb", level: "B2", definition: "in a way that shows you do not want to", example: "He reluctantly agreed to help.", phonetic: "/rɪˈlʌktəntli/" },
  { slug: "controversy", word: "controversy", partOfSpeech: "noun", level: "B2", definition: "a public disagreement", example: "The decision caused some controversy.", phonetic: "/ˈkɒntrəvɜːrsi/" },
  // C1
  { slug: "eloquent", word: "eloquent", partOfSpeech: "adjective", level: "C1", definition: "speaking clearly and persuasively", example: "Her eloquent speech impressed everyone.", phonetic: "/ˈeləkwənt/" },
  { slug: "meticulous", word: "meticulous", partOfSpeech: "adjective", level: "C1", definition: "very careful about details", example: "Good writers are meticulous with words.", phonetic: "/məˈtɪkjələs/" },
  { slug: "resilience", word: "resilience", partOfSpeech: "noun", level: "C1", definition: "the ability to recover from difficulties", example: "Learning a language builds resilience.", phonetic: "/rɪˈzɪliəns/" },
  { slug: "paradox", word: "paradox", partOfSpeech: "noun", level: "C1", definition: "a statement that seems opposite but may be true", example: "It is a paradox that standing water can be dangerous.", phonetic: "/ˈpærədɒks/" },
  { slug: "scrutinize", word: "scrutinize", partOfSpeech: "verb", level: "C1", definition: "to examine something very carefully", example: "Lawyers scrutinize every contract.", phonetic: "/ˈskruːtənaɪz/" },
  { slug: "profoundly", word: "profoundly", partOfSpeech: "adverb", level: "C1", definition: "deeply; with great meaning", example: "Travel profoundly changed her views.", phonetic: "/prəˈfaʊndli/" },
  { slug: "ambiguous", word: "ambiguous", partOfSpeech: "adjective", level: "C1", definition: "having more than one possible meaning", example: "His answer was ambiguous.", phonetic: "/æmˈbɪɡjuəs/" },
  { slug: "deteriorate", word: "deteriorate", partOfSpeech: "verb", level: "C1", definition: "to become worse over time", example: "Without practice, skills deteriorate.", phonetic: "/dɪˈtɪəriəreɪt/" },
  { slug: "serendipity", word: "serendipity", partOfSpeech: "noun", level: "C1", definition: "finding good things by chance", example: "Meeting my tutor was pure serendipity.", phonetic: "/ˌserənˈdɪpəti/" },
  { slug: "pragmatic", word: "pragmatic", partOfSpeech: "adjective", level: "C1", definition: "focused on practical results", example: "Take a pragmatic approach to studying.", phonetic: "/præɡˈmætɪk/" },
  { slug: "exemplify", word: "exemplify", partOfSpeech: "verb", level: "C1", definition: "to be a typical example of something", example: "Her career exemplifies hard work.", phonetic: "/ɪɡˈzemplɪfaɪ/" },
  { slug: "inevitably", word: "inevitably", partOfSpeech: "adverb", level: "C1", definition: "in a way that cannot be avoided", example: "Studying daily inevitably leads to progress.", phonetic: "/ɪnˈevɪtəbli/" },
];

const BY_SLUG = new Map(VOCAB_BANK.map((w) => [w.slug, w]));

/** Case-insensitive lookup. Returns null for unknown words. */
export function getWord(slug: string): VocabWord | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export interface VocabFilter {
  q?: string;
  level?: Level | "all";
  pos?: VocabWord["partOfSpeech"] | "all";
}

/** Deterministic in-memory search + filters. No I/O. */
export function searchWords(filter: VocabFilter = {}): VocabWord[] {
  const q = (filter.q ?? "").trim().toLowerCase();
  return VOCAB_BANK.filter((w) => {
    if (filter.level && filter.level !== "all" && w.level !== filter.level) return false;
    if (filter.pos && filter.pos !== "all" && w.partOfSpeech !== filter.pos) return false;
    if (!q) return true;
    return (
      w.word.includes(q) ||
      w.definition.toLowerCase().includes(q) ||
      w.example.toLowerCase().includes(q)
    );
  });
}

/** Words at the same level (excluding the word itself) — for "related words". */
export function relatedWords(word: VocabWord, count = 4): VocabWord[] {
  return VOCAB_BANK.filter((w) => w.level === word.level && w.slug !== word.slug).slice(0, count);
}

export function countByLevel(): Record<Level, number> {
  const counts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0 } as Record<Level, number>;
  for (const w of VOCAB_BANK) counts[w.level] += 1;
  return counts;
}
