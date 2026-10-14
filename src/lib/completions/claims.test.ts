import { describe, expect, it } from "vitest";
import { claimCompletion } from "./claims";

/** Minimal in-memory stub of the supabase query surface used by claims. */
function stubStore() {
  const rows: Array<{ user_id: string; scope: string; key: string }> = [];
  let failInsert = false;
  const client = {
    __rows: rows,
    __failInsert(v: boolean) { failInsert = v; },
    from(table: string) {
      if (table !== "completion_claims") throw new Error("unexpected table " + table);
      const q: Record<string, unknown> = {};
      const api = {
        select() { return api; },
        eq(col: string, val: unknown) { (q as Record<string, unknown>)[col] = val; return api; },
        async maybeSingle() {
          const hit = rows.find((r) => r.user_id === q.user_id && r.scope === q.scope && r.key === q.key);
          return { data: hit ? { id: "x" } : null };
        },
        async insert(row: { user_id: string; scope: string; key: string }) {
          if (failInsert) return { error: new Error("db down") };
          if (rows.some((r) => r.user_id === row.user_id && r.scope === row.scope && r.key === row.key)) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          rows.push(row);
          return { error: null };
        },
      };
      return api;
    },
  };
  return client;
}

describe("completion claims (anti double-XP)", () => {
  it("missing/short keys are fail-open (backward compatible)", async () => {
    const c = stubStore();
    expect(await claimCompletion(c, "u1", "grammar", undefined)).toEqual({ fresh: true });
    expect(await claimCompletion(c, "u1", "grammar", "short")).toEqual({ fresh: true });
    expect(c.__rows.length).toBe(0);
  });

  it("first claim is fresh, replay is deduped", async () => {
    const c = stubStore();
    expect(await claimCompletion(c, "u1", "reading", "key-12345678")).toEqual({ fresh: true });
    expect(await claimCompletion(c, "u1", "reading", "key-12345678")).toEqual({ fresh: false });
    expect(c.__rows.length).toBe(1);
  });

  it("keys are scoped (same key, different scope is fresh)", async () => {
    const c = stubStore();
    await claimCompletion(c, "u1", "grammar", "key-12345678");
    expect(await claimCompletion(c, "u1", "reading", "key-12345678")).toEqual({ fresh: true });
  });

  it("keys are per-user (same key, different user is fresh)", async () => {
    const c = stubStore();
    await claimCompletion(c, "u1", "grammar", "key-12345678");
    expect(await claimCompletion(c, "u2", "grammar", "key-12345678")).toEqual({ fresh: true });
  });

  it("concurrent race: loser sees winner as repeated", async () => {
    const c = stubStore();
    // Simulate winner committed between loser's select and insert by
    // pre-inserting, then having insert hit the unique violation path.
    c.__rows.push({ user_id: "u1", scope: "writing", key: "race-key-1" });
    expect(await claimCompletion(c, "u1", "writing", "race-key-1")).toEqual({ fresh: false });
  });

  it("transient DB failure is fail-closed (never duplicates XP)", async () => {
    const c = stubStore();
    c.__failInsert(true);
    await expect(claimCompletion(c, "u1", "speaking", "key-abcdef12")).rejects.toThrow("Could not reserve completion");
  });
});
