/**
 * Pronunciation drill bank — deterministic, no AI, no I/O.
 * 24 drills across A1–C1: minimal pairs, word/sentence stress,
 * linking & reductions, and intonation — each with lines to shadow aloud.
 */
import type { Level } from "@/types/database";

export type PronunciationKind =
  | "minimal-pair"
  | "word-stress"
  | "sentence-stress"
  | "linking"
  | "intonation";

export interface PronunciationDrill {
  slug: string;
  level: Level;
  title: string;
  kind: PronunciationKind;
  /** What the learner trains, e.g. "/ɪ/ vs /iː/". */
  focus: string;
  /** Stressed syllables in CAPS, e.g. "pho-TO-gra-phy". */
  syllables: string;
  ipa: string;
  tip: string;
  examples: string[];
  /** Lines to shadow / read aloud / record. */
  practiceLines: string[];
}

export const KIND_LABEL: Record<PronunciationKind, string> = {
  "minimal-pair": "Minimal pairs",
  "word-stress": "Word stress",
  "sentence-stress": "Sentence stress",
  linking: "Linking & reductions",
  intonation: "Intonation",
};

function d(drill: PronunciationDrill): PronunciationDrill {
  return drill;
}

export const PRONUNCIATION_DRILLS: PronunciationDrill[] = [
  // ---------------- A1 ----------------
  d({
    slug: "ship-sheep", level: "A1", title: "Ship vs Sheep", kind: "minimal-pair",
    focus: "/ɪ/ (short) vs /iː/ (long)",
    syllables: "SHIP · SHEEP", ipa: "/ʃɪp/ vs /ʃiːp/",
    tip: "For SHEEP, smile wide and hold the vowel longer. For SHIP, keep it short and relaxed.",
    examples: ["ship — sheep", "live — leave", "bit — beat", "sit — seat"],
    practiceLines: ["The sheep is on the ship.", "Sit in your seat, please.", "I live near the green leaves."],
  }),
  d({
    slug: "pen-pan", level: "A1", title: "Pen vs Pan", kind: "minimal-pair",
    focus: "/e/ vs /æ/",
    syllables: "PEN · PAN", ipa: "/pen/ vs /pæn/",
    tip: "PAN opens the mouth wider with the jaw dropped. PEN is more closed and relaxed.",
    examples: ["pen — pan", "men — man", "said — sad", "bed — bad"],
    practiceLines: ["Can I borrow your pen?", "Put the pan on the table.", "The man met ten men."],
  }),
  d({
    slug: "word-stress-basics", level: "A1", title: "Word Stress Basics", kind: "word-stress",
    focus: "Stress the LOUD syllable: TAble, beGIN",
    syllables: "TA-ble · be-GIN · FA-mi-ly", ipa: "/ˈteɪbl/ · /bɪˈɡɪn/ · /ˈfæməli/",
    tip: "English words have ONE strong beat. Say the stressed syllable louder and longer; shrink the rest.",
    examples: ["TA-ble (not ta-BLE)", "be-GIN (not BE-gin)", "WA-ter (not wa-TER)"],
    practiceLines: ["Put the book on the table.", "We begin at seven.", "My family drinks water."],
  }),
  d({
    slug: "hello-how-are-you", level: "A1", title: "Hello Melody", kind: "intonation",
    focus: "Friendly rise-fall on greetings",
    syllables: "HEL-lo · HOW are you", ipa: "/həˈloʊ/ · /ˌhaʊ ɑːr ˈjuː/",
    tip: "Let your voice go UP then DOWN on greetings. Flat greetings can sound bored or rude.",
    examples: ["Hello! (rise-fall)", "How are you? (rise-fall)", "Good morning! (rise-fall)"],
    practiceLines: ["Hello! How are you today?", "Good morning, Anna!", "Hi, Tom! Nice to see you."],
  }),
  // ---------------- A2 ----------------
  d({
    slug: "full-fool", level: "A2", title: "Full vs Fool", kind: "minimal-pair",
    focus: "/ʊ/ vs /uː/",
    syllables: "FULL · FOOL", ipa: "/fʊl/ vs /fuːl/",
    tip: "FOOL rounds the lips tightly and holds long. FULL is short with relaxed lips.",
    examples: ["full — fool", "pull — pool", "look — Luke", "book — boot"],
    practiceLines: ["The pool is full today.", "Look at the blue boots.", "He pulled the book from the pool bag."],
  }),
  d({
    slug: "thin-thing", level: "A2", title: "Thin vs Thing (th)", kind: "minimal-pair",
    focus: "/θ/ vs /ð/ vs /t/",
    syllables: "THIN · THIS", ipa: "/θɪn/ vs /ðɪs/",
    tip: "Put the tongue tip BETWEEN the teeth and blow gently. Do not replace it with /t/ or /z/.",
    examples: ["thin — tin", "think — sink", "this — these", "three — tree"],
    practiceLines: ["I think this is thin.", "Three things on the table.", "These thin books are mine."],
  }),
  d({
    slug: "record-stress", level: "A2", title: "REcord vs reCORD", kind: "word-stress",
    focus: "Noun FIRST syllable, verb SECOND",
    syllables: "RE-cord (noun) · re-CORD (verb)", ipa: "/ˈrekɔːrd/ vs /rɪˈkɔːrd/",
    tip: "Two-syllable words often stress the noun on syllable 1 and the verb on syllable 2: PREsent/preSENT, OBject/obJECT.",
    examples: ["RE-cord (noun) — re-CORD (verb)", "PRE-sent — pre-SENT", "IM-port — im-PORT"],
    practiceLines: ["Please record this record.", "Thank you for the present.", "We import this import weekly."],
  }),
  d({
    slug: "yes-no-questions", level: "A2", title: "Yes/No Question Rise", kind: "intonation",
    focus: "Voice RISES at the end of yes/no questions",
    syllables: "Are you READ-y↗", ipa: "↗ final rise",
    tip: "Yes/no questions rise at the end (↗). Wh-questions usually fall (↘). Swapping them confuses listeners.",
    examples: ["Are you ready? ↗", "Do you like tea? ↗", "Where are you? ↘"],
    practiceLines: ["Are you coming with us?", "Did you invite them?", "Can you repair this?"],
  }),
  d({
    slug: "gonna-wanna", level: "A2", title: "Gonna · Wanna · Gotta", kind: "linking",
    focus: "Natural reductions in fast speech",
    syllables: "GO-ing to → GON-na", ipa: "/ˈɡʌnə/ · /ˈwɑːnə/ · /ˈɡɑːtə/",
    tip: "Native speakers shrink going to → gonna, want to → wanna, got to → gotta. Practise them, but write the full forms.",
    examples: ["going to → gonna", "want to → wanna", "got to → gotta"],
    practiceLines: ["I'm gonna visit my family.", "Do you wanna come?", "We gotta leave early."],
  }),
  // ---------------- B1 ----------------
  d({
    slug: "vet-wet", level: "B1", title: "Vet vs Wet", kind: "minimal-pair",
    focus: "/v/ vs /w/",
    syllables: "VET · WET", ipa: "/vet/ vs /wet/",
    tip: "For /v/, bite your lower lip gently and buzz. For /w/, round the lips with no teeth contact.",
    examples: ["vet — wet", "vine — wine", "vest — west", "very — wary"],
    practiceLines: ["The vet walks west daily.", "It is very wet today.", "We drove west to the vet."],
  }),
  d({
    slug: "photography-stress", level: "B1", title: "PHOtograph → phoTOgraphy", kind: "word-stress",
    focus: "Stress SHIFTS in word families",
    syllables: "PHO-to-graph · pho-TO-gra-phy · pho-to-GRA-phic", ipa: "/ˈfoʊtəɡræf/ · /fəˈtɑːɡrəfi/",
    tip: "Long words shift stress when suffixes arrive: PHOtograph, phoTOgraphy, photoGRAphic. Learn families together.",
    examples: ["PHO-to-graph → pho-TO-gra-phy", "E-co-no-my → e-co-NO-mic", "DE-mo-cra-cy → de-mo-CRA-tic"],
    practiceLines: ["Photography is widely popular.", "The economic decision was pragmatic.", "Democratic habits take practice."],
  }),
  d({
    slug: "content-stress", level: "B1", title: "Sentence Stress: Content Words", kind: "sentence-stress",
    focus: "Stress MEANING words, shrink grammar words",
    syllables: "I WANT a CUP of TEA", ipa: "content ≫ function",
    tip: "Stress nouns, verbs, adjectives, adverbs — whisper a, the, of, to, and. Your rhythm instantly sounds natural.",
    examples: ["I WANT a CUP of TEA.", "She WORKS in the MOR-ning.", "They LIVE near the SCHOOL."],
    practiceLines: ["I want a cup of strong tea.", "She works in the morning.", "They live near the crowded school."],
  }),
  d({
    slug: "linking-consonant-vowel", level: "B1", title: "Link It: Consonant + Vowel", kind: "linking",
    focus: "Join words: pick‿it‿up",
    syllables: "pick‿IT‿UP · cup‿OF tea", ipa: "/pɪkɪtʌp/",
    tip: "When a word ends in a consonant and the next starts with a vowel, glue them: pick‿it‿up sounds like one word.",
    examples: ["pick‿it‿up", "cup‿of tea", "turn‿off‿it"],
    practiceLines: ["Pick it up, please.", "A cup of tea, please.", "Turn off the light."],
  }),
  d({
    slug: "list-intonation", level: "B1", title: "Lists & Choices Melody", kind: "intonation",
    focus: "Rise, rise… FALL on the last item",
    syllables: "AP-ples↗, BREAD↗ and CHEESE↘", ipa: "↗ ↗ ↘",
    tip: "In lists, rise on every item except the LAST, which falls. The fall tells listeners you finished.",
    examples: ["Apples↗, bread↗ and cheese↘.", "Tea↗ or coffee↘?", "Monday↗, Tuesday↗, done↘."],
    practiceLines: ["I bought apples, bread and cheese.", "Tea or coffee?", "First, then, finally — done."],
  }),
  // ---------------- B2 ----------------
  d({
    slug: "day-they", level: "B2", title: "Day vs They", kind: "minimal-pair",
    focus: "/d/ vs /ð/ at word start",
    syllables: "DAY · THEY", ipa: "/deɪ/ vs /ðeɪ/",
    tip: "/ð/ needs the tongue between the teeth. Saying DAY for THEY is the most noticeable error — exaggerate at first.",
    examples: ["day — they", "doze — those", "dare — there", "den — then"],
    practiceLines: ["They work every day.", "Those doors close then.", "There is no better day than today."],
  }),
  d({
    slug: "efficient-vs-efficient", level: "B2", title: "Efficient Rhythm", kind: "word-stress",
    focus: "3-beat words: e-FFI-cient",
    syllables: "e-FFI-cient · con-SE-quence · per-SIST", ipa: "/ɪˈfɪʃənt/ · /ˈkɒnsɪkwəns/",
    tip: "Three-syllable words usually stress syllable 1 or 2 — almost never 3. Mark the beat before you drill.",
    examples: ["e-FFI-cient", "CON-se-quence", "per-SIST"],
    practiceLines: ["An efficient routine persists.", "Every choice has a consequence.", "Insight beats mere efficiency."],
  }),
  d({
    slug: "contrast-stress", level: "B2", title: "Contrast Stress", kind: "sentence-stress",
    focus: "Stress the WORD that corrects: I said TUES-day",
    syllables: "I said TUES-day (not WEDNES-day)", ipa: "contrast ≫",
    tip: "Stress the word that carries the correction or surprise — even small words: I said TUESday, not WEDNESday.",
    examples: ["I said TUES-day.", "SHE did it (not he).", "I WANT it (not need it)."],
    practiceLines: ["I said Tuesday, not Wednesday.", "She finished it herself.", "I want accuracy, not speed."],
  }),
  d({
    slug: "intrusive-sounds", level: "B2", title: "Intrusive /w/ and /j/", kind: "linking",
    focus: "go‿(w)on · I‿(y)agree",
    syllables: "go(W)ON · I(Y)AGREE", ipa: "/ɡoʊwɒn/ · /aɪjəɡriː/",
    tip: "After rounded vowels (go, do, you) a tiny /w/ appears; after /iː/ a tiny /j/: go(w)on, I(j)agree. Don't fight it.",
    examples: ["go‿(w)on", "do‿(w)it", "I‿(y)agree", "she‿(y)is"],
    practiceLines: ["Go on, persist daily.", "Do it accurately.", "I agree with your insight."],
  }),
  d({
    slug: "tag-questions", level: "B2", title: "Tag Questions: Sure vs Unsure", kind: "intonation",
    focus: "FALL = sure, RISE = really asking",
    syllables: "Nice DAY, ISN'T it↘ (sure) · ↗ (asking)", ipa: "↘ certain · ↗ uncertain",
    tip: "Falling tags expect agreement (Nice day, isn't it↘). Rising tags genuinely ask (You persist↗, don't you↗?).",
    examples: ["Nice day, isn't it↘? (sure)", "You're new, aren't you↗? (asking)", "It persists, doesn't it↘?"],
    practiceLines: ["Efficient habits help, don't they?", "You're learning fast, aren't you?", "Insight matters, doesn't it?"],
  }),
  // ---------------- C1 ----------------
  d({
    slug: "world-word", level: "C1", title: "World vs Word vs Work", kind: "minimal-pair",
    focus: "/ɜː/ + dark /l/ clusters",
    syllables: "WORLD · WORD · WORK", ipa: "/wɜːrld/ vs /wɜːrd/ vs /wɜːrk/",
    tip: "Do NOT add an extra vowel (wuh-ruld). Keep one long /ɜː/, then flick the tongue for /l/ without a new syllable.",
    examples: ["world — word — work", "girl — goal (no!)", "hurl — heard"],
    practiceLines: ["Her work changed the world.", "One precise word beats paragraphs.", "The resilient world keeps working."],
  }),
  d({
    slug: "ambiguous-pragmatic", level: "C1", title: "amBIguous, pragMAtic", kind: "word-stress",
    focus: "Secondary + primary stress in long words",
    syllables: "am-BI-gu-ous · prag-MA-tic · me-TI-cu-lous", ipa: "/æmˈbɪɡjuəs/ · /præɡˈmætɪk/",
    tip: "Long academic words have TWO beats: a small one and a big one. Tap both: am-BI-gu-ous, prag-MA-tic.",
    examples: ["am-BI-gu-ous", "prag-MA-tic", "me-TI-cu-lous"],
    practiceLines: ["His answer was ambiguous.", "Take a pragmatic approach.", "Meticulous writers check every word."],
  }),
  d({
    slug: "thought-groups", level: "C1", title: "Thought Groups & Pausing", kind: "sentence-stress",
    focus: "Chunk ideas: pause at | bars",
    syllables: "When the re-SULTS came | I was PROUD | de-SPI-TE the noise", ipa: "chunk | pause | chunk",
    tip: "Split long sentences into 3–6 word chunks with micro-pauses. Pausing in the wrong place destroys meaning.",
    examples: ["When the results came | I was proud.", "Despite the noise | she persisted.", "What she needed | was time."],
    practiceLines: ["When the results came, I was profoundly proud.", "Despite the controversy, she persisted.", "What resilient learners need is time."],
  }),
  d({
    slug: "elision-t-d", level: "C1", title: "Elision: Dropping /t/ and /d/", kind: "linking",
    focus: "las(t) night · hol(d) on · nex(t) week",
    syllables: "LAST night → LAS' night", ipa: "/læs naɪt/",
    tip: "Between consonants, /t/ and /d/ often vanish: last‿night → las'‿night, hold‿on → hol'‿on. Your ear must know this.",
    examples: ["las(t) night", "hol(d) on", "nex(t) week", "jus(t) one"],
    practiceLines: ["Last night I reviewed just one chapter.", "Hold on, next week works better.", "Just persist; most learners improve."],
  }),
  d({
    slug: "sarcasm-emphasis", level: "C1", title: "Attitude Through Pitch", kind: "intonation",
    focus: "Same words, different MEANING",
    syllables: "GREAT↘ (genuine) · GREEEAT↗↘ (sarcastic)", ipa: "pitch range = attitude",
    tip: "A wide pitch swing signals enthusiasm or sarcasm; narrow pitch sounds bored. Match your range to your intention.",
    examples: ["Great. (flat = bored)", "Great! (wide fall = genuine)", "Oh, great… (rise-fall = sarcastic)"],
    practiceLines: ["Eloquent and meticulous — great work.", "Oh great, another ambiguous email.", "Serendipity, inevitably, rewards resilience."],
  }),
];

const BY_SLUG = new Map(PRONUNCIATION_DRILLS.map((x) => [x.slug, x]));

export function getPronunciationDrill(slug: string): PronunciationDrill | null {
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function listPronunciationDrills(level?: string | null, kind?: string | null): PronunciationDrill[] {
  return PRONUNCIATION_DRILLS.filter((x) => {
    if (level && level !== "all" && x.level !== level) return false;
    if (kind && kind !== "all" && x.kind !== kind) return false;
    return true;
  });
}

/** 0–100 score from a 1–5 learner self-rating (honest practice, never fake precision). */
export function scoreFromSelfRating(rating: number): number {
  const r = Math.min(5, Math.max(1, Math.round(rating)));
  return { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 }[r] ?? 60;
}
