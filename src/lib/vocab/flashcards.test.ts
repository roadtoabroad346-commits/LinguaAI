import { describe, expect, it } from "vitest";
import {
  shuffleDeck,
  cardSides,
  buildChoices,
  gradeTyped,
  normaliseTyped,
  type FlashCard,
} from "./flashcards";

const DECK: FlashCard[] = ["bright", "journey", "kind", "family", "water"].map((w, i) => ({
  slug: w,
  word: w,
  definition: `def-${w}`,
  example: `ex-${w}`,
  phonetic: `/${w}/`,
  partOfSpeech: "noun",
  level: "A1",
  mastery: i * 10,
}));

describe("flashcard study helpers", () => {
  it("shuffles deterministically per seed and preserves cards", () => {
    const a = shuffleDeck(DECK, "seed-1");
    const b = shuffleDeck(DECK, "seed-1");
    const c = shuffleDeck(DECK, "seed-2");
    expect(a.map((x) => x.slug)).toEqual(b.map((x) => x.slug));
    expect([...a.map((x) => x.slug)].sort()).toEqual([...DECK.map((x) => x.slug)].sort());
    // Different seeds almost surely differ on 5 cards (guard against identity shuffle).
    expect(a.map((x) => x.slug).join()).not.toBe(DECK.map((x) => x.slug).join());
    expect(c.map((x) => x.slug)).not.toEqual(DECK.map((x) => x.slug));
  });
  it("resolves front/back per direction, mixed alternates", () => {
    const fwd = cardSides(DECK[0], "word-def", 0);
    expect(fwd.front).toBe("bright");
    const rev = cardSides(DECK[0], "def-word", 0);
    expect(rev.front).toBe("def-bright");
    expect(rev.back).toBe("bright");
    expect(cardSides(DECK[0], "mixed", 0).front).toBe("bright");
    expect(cardSides(DECK[0], "mixed", 1).front).toBe("def-bright");
  });
  it("builds 4 unique choices containing the answer", () => {
    const { options, answer } = buildChoices(DECK[0], DECK);
    expect(options).toHaveLength(4);
    expect(options[answer]).toBe("def-bright");
    expect(new Set(options).size).toBe(4);
    // Deterministic.
    expect(buildChoices(DECK[0], DECK).answer).toBe(answer);
  });
  it("grades typed answers forgivingly", () => {
    expect(gradeTyped("bright", "  BRIGHT! ")).toBe(true);
    expect(gradeTyped("bright", "brihgt")).toBe(false);
    expect(gradeTyped("bright", "")).toBe(false);
    expect(normaliseTyped("Don't  stop!")).toBe("don't stop");
  });
});
