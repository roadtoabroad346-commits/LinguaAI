import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  GUEST_PLACEMENT_KEY,
  clearGuestPlacement,
  migrateGuestPlacement,
  readGuestPlacement,
  saveGuestPlacement,
} from "@/lib/placement/guest";

function memStore(initial: Record<string, string> = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    has: (k: string) => m.has(k),
  };
}

const answers = [
  { questionId: "a1-1", selected: 1 },
  { questionId: "a1-2", selected: 0 },
];

describe("guest placement carry-over", () => {
  it("round-trips a saved result", () => {
    const s = memStore();
    saveGuestPlacement(s, { answers, learningMode: "free" });
    const back = readGuestPlacement(s);
    expect(back?.answers).toEqual(answers);
    expect(back?.learningMode).toBe("free");
    clearGuestPlacement(s);
    expect(s.has(GUEST_PLACEMENT_KEY)).toBe(false);
  });

  it("rejects corrupt and expired payloads", () => {
    expect(readGuestPlacement(memStore({ [GUEST_PLACEMENT_KEY]: "not-json" }))).toBeNull();
    expect(readGuestPlacement(memStore({ [GUEST_PLACEMENT_KEY]: JSON.stringify({ answers: [] }) }))).toBeNull();
    const old = { answers, savedAt: Date.now() - 8 * 24 * 3600 * 1000 };
    expect(readGuestPlacement(memStore({ [GUEST_PLACEMENT_KEY]: JSON.stringify(old) }))).toBeNull();
  });

  it("uses a namespaced key swept on sign-out", () => {
    expect(GUEST_PLACEMENT_KEY.startsWith("linguaai:")).toBe(true);
  });

  describe("migrateGuestPlacement", () => {
    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it("no-ops without a stored result (zero fetches)", async () => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      const ls = memStore();
      vi.stubGlobal("window", undefined as never);
      // No window: store() is null -> "nothing" without touching fetch.
      expect(await migrateGuestPlacement()).toBe("nothing");
      expect(fetch).not.toHaveBeenCalled();
      void ls;
      vi.unstubAllGlobals();
    });

    it("drops the guest result when the profile already has a level", async () => {
      const s = memStore();
      saveGuestPlacement(s, { answers });
      const fetch = vi.fn(async (url: string) => {
        if (String(url).includes("/api/me/status")) {
          return { status: 200, json: async () => ({ level: "B1", placementCompleted: true }) };
        }
        throw new Error("unexpected " + url);
      });
      vi.stubGlobal("fetch", fetch as never);
      vi.stubGlobal("window", { localStorage: s } as never);
      expect(await migrateGuestPlacement()).toBe("already-placed");
      expect(s.has(GUEST_PLACEMENT_KEY)).toBe(false);
      vi.unstubAllGlobals();
    });

    it("replays answers and clears on saved:true", async () => {
      const s = memStore();
      saveGuestPlacement(s, { answers, learningMode: "guided" });
      const calls: string[] = [];
      const fetch = vi.fn(async (url: string, init?: { body?: string }) => {
        calls.push(String(url));
        if (String(url).includes("/api/me/status")) {
          return { status: 200, json: async () => ({ level: null, placementCompleted: false }) };
        }
        const body = JSON.parse(init?.body ?? "{}");
        expect(body.answers).toEqual(answers);
        return { ok: true, json: async () => ({ saved: true, level: "A2" }) };
      });
      vi.stubGlobal("fetch", fetch as never);
      vi.stubGlobal("window", { localStorage: s } as never);
      expect(await migrateGuestPlacement()).toBe("migrated");
      expect(calls).toContain("/api/placement/submit");
      expect(s.has(GUEST_PLACEMENT_KEY)).toBe(false);
      vi.unstubAllGlobals();
    });

    it("keeps the result when the replay fails", async () => {
      const s = memStore();
      saveGuestPlacement(s, { answers });
      const fetch = vi.fn(async (url: string) => {
        if (String(url).includes("/api/me/status")) {
          return { status: 200, json: async () => ({ level: null, placementCompleted: false }) };
        }
        return { ok: false, json: async () => ({ error: "x" }) };
      });
      vi.stubGlobal("fetch", fetch as never);
      vi.stubGlobal("window", { localStorage: s } as never);
      expect(await migrateGuestPlacement()).toBe("failed");
      expect(s.has(GUEST_PLACEMENT_KEY)).toBe(true);
      vi.unstubAllGlobals();
    });
  });
});
