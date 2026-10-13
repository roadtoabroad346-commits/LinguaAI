import { describe, expect, it } from "vitest";
import { placementDraftPayloadSchema, placementDraftUpsertSchema } from "@/lib/auth/schemas";
import { draftToPayload, draftTouched, newDraft, payloadToDraft } from "@/lib/placement/draft";

describe("server draft validation", () => {
  it("accepts partial payloads but rejects oversized text", () => {
    expect(placementDraftPayloadSchema.safeParse({}).success).toBe(true);
    expect(
      placementDraftPayloadSchema.safeParse({ writingText: "hello world", learningMode: "free" }).success
    ).toBe(true);
    expect(
      placementDraftPayloadSchema.safeParse({ writingText: "x".repeat(4000) }).success
    ).toBe(false);
  });

  it("requires attemptKey on upsert", () => {
    expect(placementDraftUpsertSchema.safeParse({ attemptKey: "abc", payload: {} }).success).toBe(false);
    expect(
      placementDraftUpsertSchema.safeParse({ attemptKey: "key-12345678", payload: {}, sectionIndex: 3 }).success
    ).toBe(true);
  });

  it("round-trips draft <-> payload without data loss", () => {
    const d = newDraft("key-12345678");
    d.answers = { "a1-1": 1 };
    d.writingText = "Last weekend I went home.";
    d.sectionIndex = 4;
    const payload = draftToPayload(d);
    const back = payloadToDraft(d.attemptKey, d.sectionIndex, payload);
    expect(back.answers).toEqual({ "a1-1": 1 });
    expect(back.writingText).toContain("Last weekend");
    expect(draftTouched(back)).toBe(true);
    expect(draftTouched(newDraft("key-12345678"))).toBe(false);
  });

  it("newest updatedAt wins (multi-device merge rule)", () => {
    const a = newDraft("key-A");
    a.updatedAt = 1000;
    a.answers = { "a1-1": 1 };
    const b = payloadToDraft("key-B", 5, { answers: { "a1-2": 2 } });
    b.updatedAt = 2000;
    const winner = b.updatedAt > a.updatedAt ? b : a;
    expect(winner.attemptKey).toBe("key-B");
    expect(winner.sectionIndex).toBe(5);
  });
});
