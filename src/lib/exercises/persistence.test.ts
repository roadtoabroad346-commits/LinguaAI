import { describe, expect, it } from "vitest";
import { savePracticeAnswer, type PracticeRpcClient } from "@/lib/exercises/persistence";

describe("savePracticeAnswer", () => {
  it("keeps the Supabase rpc method bound to its client", async () => {
    const client = {
      rest: { called: false },
      rpc(this: { rest: { called: boolean } }) {
        this.rest.called = true;
        return Promise.resolve({ data: [], error: null });
      },
    };

    await savePracticeAnswer(client as unknown as PracticeRpcClient, { p_session_key: "test" });

    expect(client.rest.called).toBe(true);
  });
});

