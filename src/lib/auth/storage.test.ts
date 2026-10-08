import { describe, expect, it } from "vitest";
import { decideGuestMerge, namespacedKey, readGuestData } from "./storage";

function memStore(seed: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => (m.has(k) ? (m.get(k) as string) : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  } as Storage;
}

describe("storage hygiene", () => {
  it("namespaces keys per user", () => {
    expect(namespacedKey("user-1", "theme")).toBe("linguaai:user-1:theme");
    expect(namespacedKey("guest", "x")).toBe("linguaai:guest:x");
  });
  it("server wins on guest merge", () => {
    const d = decideGuestMerge({
      guest: { savedWords: ["Apple", "banana"], favorites: ["a"] },
      serverWords: ["apple"],
      placementCompleted: true,
    });
    expect(d.wordsToImport).toEqual(["banana"]);
    expect(d.placementLocked).toBe(true);
  });
  it("reads guest snapshot best-effort", () => {
    const s = memStore({ "linguaai:saved-words": JSON.stringify(["a", 1, null]) });
    expect(readGuestData(s).savedWords).toEqual(["a"]);
  });
});
