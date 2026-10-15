import { describe, expect, it } from "vitest";
import { readJson } from "@/lib/api/response";

describe("readJson", () => {
  it("returns valid JSON", async () => {
    await expect(readJson<{ ok: boolean }>(Response.json({ ok: true }))).resolves.toEqual({ ok: true });
  });

  it("turns an empty success response into an actionable error", async () => {
    await expect(readJson(new Response(null, { status: 200 }))).rejects.toThrow("empty response");
  });

  it("preserves the HTTP status for an empty failure", async () => {
    await expect(readJson(new Response(null, { status: 500 }))).rejects.toThrow("HTTP 500");
  });

  it("does not expose raw JSON parser errors for HTML failures", async () => {
    await expect(readJson(new Response("<html>failed</html>", { status: 502 }))).rejects.toThrow(
      "invalid response (HTTP 502)",
    );
  });
});

