/** Phase 3 — deterministic vocabulary bank (no AI, no I/O). 100 words, 20 per level A1–C1, across 7 topics. */
import type { Level } from "@/types/database";

export interface VocabWord {
  slug: string;
  word: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb";
  level: Level;
  definition: string;
  example: string;
  phonetic: string;
  /** Content topic (stays English — it is learning content, not UI chrome). */
  topic?: VocabTopic;
}

export type VocabTopic =
  | "everyday"
  | "travel"
  | "business"
  | "academic"
  | "technology"
  | "education"
  | "culture";

export const VOCAB_TOPICS: VocabTopic[] = [
  "everyday",
  "travel",
  "business",
  "academic",
  "technology",
  "education",
  "culture",
];

/** Topics for the original 60 bank words (kept separate so history stays clean). */
const LEGACY_TOPICS: Record<string, VocabTopic> = {
  bright: "everyday", journey: "travel", kind: "everyday", family: "everyday",
  water: "everyday", happy: "everyday", eat: "everyday", book: "education",
  quickly: "everyday", house: "everyday", learn: "education", big: "everyday",
  achieve: "education", brave: "everyday", habit: "everyday", borrow: "everyday",
  weather: "travel", carefully: "everyday", invite: "everyday", loud: "culture",
  reply: "business", choice: "everyday", often: "everyday", repair: "everyday",
  curious: "education", opportunity: "business", reliable: "business", improve: "education",
  experience: "business", suddenly: "everyday", suggest: "business", crowded: "travel",
  decision: "business", expect: "everyday", widely: "culture", benefit: "business",
  efficient: "business", insight: "academic", persist: "education", diverse: "culture",
  consequence: "academic", accurately: "academic", interpret: "academic", inevitable: "academic",
  phenomenon: "academic", acquire: "education", reluctantly: "everyday", controversy: "culture",
  eloquent: "academic", meticulous: "business", resilience: "education", paradox: "academic",
  scrutinize: "business", profoundly: "culture", ambiguous: "academic", deteriorate: "everyday",
  serendipity: "culture", pragmatic: "business", exemplify: "academic", inevitably: "academic",
};

/** Topic for any bank word (inline field wins, legacy map covers the original 60). */
export function wordTopic(w: Pick<VocabWord, "slug" | "topic">): VocabTopic {
  return w.topic ?? LEGACY_TOPICS[w.slug] ?? "everyday";
}

/** Topics actually present in the bank (for filter chips). */
export function listTopics(): VocabTopic[] {
  const seen = new Set<VocabTopic>();
  for (const w of VOCAB_BANK) seen.add(wordTopic(w));
  return VOCAB_TOPICS.filter((t) => seen.has(t));
}

export const PARTS_OF_SPEECH = ["noun", "verb", "adjective", "adverb"] as const;

const VOCAB_BASE: VocabWord[] = [
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

/** Expansion set: 40 more words (8 per level) across travel / business / academic / technology / culture. */
const VOCAB_EXTRA: VocabWord[] = [
  // A1
  { slug: "ticket", word: "ticket", partOfSpeech: "noun", level: "A1", topic: "travel", definition: "a small paper that lets you travel or enter", example: "I bought two tickets for the bus.", phonetic: "/ˈtɪkɪt/" },
  { slug: "hungry", word: "hungry", partOfSpeech: "adjective", level: "A1", topic: "everyday", definition: "wanting food", example: "The children were hungry after school.", phonetic: "/ˈhʌŋɡri/" },
  { slug: "late", word: "late", partOfSpeech: "adjective", level: "A1", topic: "everyday", definition: "after the right or planned time", example: "Hurry, we are late for class!", phonetic: "/leɪt/" },
  { slug: "clean", word: "clean", partOfSpeech: "adjective", level: "A1", topic: "everyday", definition: "not dirty", example: "Please keep your room clean.", phonetic: "/kliːn/" },
  { slug: "rain", word: "rain", partOfSpeech: "noun", level: "A1", topic: "everyday", definition: "water falling from clouds", example: "Take an umbrella; the rain is heavy.", phonetic: "/reɪn/" },
  { slug: "song", word: "song", partOfSpeech: "noun", level: "A1", topic: "culture", definition: "music with words that you sing", example: "She sang a beautiful song.", phonetic: "/sɒŋ/" },
  { slug: "map", word: "map", partOfSpeech: "noun", level: "A1", topic: "travel", definition: "a picture showing places and roads", example: "Look at the map before we leave.", phonetic: "/mæp/" },
  { slug: "shop", word: "shop", partOfSpeech: "verb", level: "A1", topic: "everyday", definition: "to buy things in stores", example: "We shop at the market on Saturdays.", phonetic: "/ʃɒp/" },
  // A2
  { slug: "delay", word: "delay", partOfSpeech: "noun", level: "A2", topic: "travel", definition: "when something starts later than planned", example: "The flight delay was two hours.", phonetic: "/dɪˈleɪ/" },
  { slug: "luggage", word: "luggage", partOfSpeech: "noun", level: "A2", topic: "travel", definition: "bags you carry when travelling", example: "Our luggage arrived late.", phonetic: "/ˈlʌɡɪdʒ/" },
  { slug: "receipt", word: "receipt", partOfSpeech: "noun", level: "A2", topic: "business", definition: "paper proving you paid for something", example: "Keep the receipt for the headphones.", phonetic: "/rɪˈsiːt/" },
  { slug: "polite", word: "polite", partOfSpeech: "adjective", level: "A2", topic: "everyday", definition: "having good manners", example: "It is polite to say thank you.", phonetic: "/pəˈlaɪt/" },
  { slug: "save", word: "save", partOfSpeech: "verb", level: "A2", topic: "technology", definition: "to keep data on a device", example: "Save your work every ten minutes.", phonetic: "/seɪv/" },
  { slug: "charge", word: "charge", partOfSpeech: "verb", level: "A2", topic: "technology", definition: "to put power into a battery", example: "Charge your phone before the trip.", phonetic: "/tʃɑːrdʒ/" },
  { slug: "grade", word: "grade", partOfSpeech: "noun", level: "A2", topic: "education", definition: "a mark given for school work", example: "She got a good grade in English.", phonetic: "/ɡreɪd/" },
  { slug: "cancel", word: "cancel", partOfSpeech: "verb", level: "A2", topic: "everyday", definition: "to stop something that was planned", example: "They cancelled the match because of rain.", phonetic: "/ˈkænsəl/" },
  // B1
  { slug: "deadline", word: "deadline", partOfSpeech: "noun", level: "B1", topic: "business", definition: "the date by which work must be finished", example: "We met the deadline on Friday.", phonetic: "/ˈdedlaɪn/" },
  { slug: "budget", word: "budget", partOfSpeech: "noun", level: "B1", topic: "business", definition: "a plan for how to spend money", example: "Our travel budget is small.", phonetic: "/ˈbʌdʒɪt/" },
  { slug: "upgrade", word: "upgrade", partOfSpeech: "verb", level: "B1", topic: "technology", definition: "to improve software or a device", example: "Upgrade the app to get new features.", phonetic: "/ˌʌpˈɡreɪd/" },
  { slug: "essay", word: "essay", partOfSpeech: "noun", level: "B1", topic: "academic", definition: "a short piece of writing on one topic", example: "Write a 200-word essay about cities.", phonetic: "/ˈeseɪ/" },
  { slug: "debate", word: "debate", partOfSpeech: "noun", level: "B1", topic: "academic", definition: "a formal discussion with two sides", example: "The debate about phones was lively.", phonetic: "/dɪˈbeɪt/" },
  { slug: "neighbourhood", word: "neighbourhood", partOfSpeech: "noun", level: "B1", topic: "everyday", definition: "the area around your home", example: "Our neighbourhood is quiet and green.", phonetic: "/ˈneɪbərhʊd/" },
  { slug: "bargain", word: "bargain", partOfSpeech: "noun", level: "B1", topic: "travel", definition: "something cheap for its value", example: "The tickets were a real bargain.", phonetic: "/ˈbɑːrɡɪn/" },
  { slug: "fluent", word: "fluent", partOfSpeech: "adjective", level: "B1", topic: "education", definition: "speaking smoothly and easily", example: "Daily practice made her fluent.", phonetic: "/ˈfluːənt/" },
  // B2
  { slug: "startup", word: "startup", partOfSpeech: "noun", level: "B2", topic: "business", definition: "a new small company", example: "She joined a tech startup in Berlin.", phonetic: "/ˈstɑːrtʌp/" },
  { slug: "algorithm", word: "algorithm", partOfSpeech: "noun", level: "B2", topic: "technology", definition: "a set of steps a computer follows", example: "The algorithm suggests new words to review.", phonetic: "/ˈælɡərɪðəm/" },
  { slug: "thesis", word: "thesis", partOfSpeech: "noun", level: "B2", topic: "academic", definition: "a long research paper for a degree", example: "His thesis studied city traffic.", phonetic: "/ˈθiːsɪs/" },
  { slug: "drawback", word: "drawback", partOfSpeech: "noun", level: "B2", topic: "business", definition: "a disadvantage of something", example: "One drawback of remote work is loneliness.", phonetic: "/ˈdrɔːbæk/" },
  { slug: "itinerary", word: "itinerary", partOfSpeech: "noun", level: "B2", topic: "travel", definition: "a plan of a journey with places and times", example: "Our itinerary lists three cities.", phonetic: "/aɪˈtɪnərəri/" },
  { slug: "mindset", word: "mindset", partOfSpeech: "noun", level: "B2", topic: "academic", definition: "a way of thinking about things", example: "A growth mindset helps learners persist.", phonetic: "/ˈmaɪndset/" },
  { slug: "outage", word: "outage", partOfSpeech: "noun", level: "B2", topic: "technology", definition: "a time when power or service stops", example: "The outage lasted one hour.", phonetic: "/ˈaʊtɪdʒ/" },
  { slug: "freelance", word: "freelance", partOfSpeech: "adjective", level: "B2", topic: "business", definition: "working for yourself, not one company", example: "He does freelance design work.", phonetic: "/ˈfriːlæns/" },
  // C1
  { slug: "nuanced", word: "nuanced", partOfSpeech: "adjective", level: "C1", topic: "academic", definition: "showing small but important differences", example: "Her nuanced essay impressed the judges.", phonetic: "/ˈnuːɑːnst/" },
  { slug: "ubiquitous", word: "ubiquitous", partOfSpeech: "adjective", level: "C1", topic: "technology", definition: "found everywhere", example: "Phones are ubiquitous in modern schools.", phonetic: "/juːˈbɪkwɪtəs/" },
  { slug: "dichotomy", word: "dichotomy", partOfSpeech: "noun", level: "C1", topic: "academic", definition: "a division into two opposite parts", example: "The work–life dichotomy keeps growing.", phonetic: "/daɪˈkɒtəmi/" },
  { slug: "concierge", word: "concierge", partOfSpeech: "noun", level: "C1", topic: "travel", definition: "a hotel worker who helps guests", example: "Ask the concierge for a city map.", phonetic: "/ˌkɒnsiˈeərʒ/" },
  { slug: "red-tape", word: "red tape", partOfSpeech: "noun", level: "C1", topic: "business", definition: "official rules that cause delay", example: "Visa red tape delayed the trip by weeks.", phonetic: "/ˌred ˈteɪp/" },
  { slug: "corroborate", word: "corroborate", partOfSpeech: "verb", level: "C1", topic: "academic", definition: "to support a claim with evidence", example: "New data corroborates her claim.", phonetic: "/kəˈrɒbəreɪt/" },
  { slug: "burnout", word: "burnout", partOfSpeech: "noun", level: "C1", topic: "business", definition: "extreme tiredness from too much work", example: "Regular rest prevents burnout.", phonetic: "/ˈbɜːrnaʊt/" },
  { slug: "juxtapose", word: "juxtapose", partOfSpeech: "verb", level: "C1", topic: "academic", definition: "to place side by side to compare", example: "The report juxtaposes two crowded cities.", phonetic: "/ˌdʒʌkstəˈpoʊz/" },
];

export const VOCAB_BANK: VocabWord[] = [...VOCAB_BASE, ...VOCAB_EXTRA];

const BY_SLUG = new Map(VOCAB_BANK.map((w) => [w.slug, w]));

/** Case-insensitive lookup. Returns null for unknown words. */
export function getWord(slug: string): VocabWord | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export interface VocabFilter {
  q?: string;
  level?: Level | "all";
  pos?: VocabWord["partOfSpeech"] | "all";
  topic?: VocabTopic | "all";
}

/** Deterministic in-memory search + filters. No I/O. */
export function searchWords(filter: VocabFilter = {}): VocabWord[] {
  const q = (filter.q ?? "").trim().toLowerCase();
  return VOCAB_BANK.filter((w) => {
    if (filter.level && filter.level !== "all" && w.level !== filter.level) return false;
    if (filter.pos && filter.pos !== "all" && w.partOfSpeech !== filter.pos) return false;
    if (filter.topic && filter.topic !== "all" && wordTopic(w) !== filter.topic) return false;
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
