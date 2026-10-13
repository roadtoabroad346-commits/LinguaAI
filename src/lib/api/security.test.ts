import { describe, expect, it } from "vitest";
import { __resetRateLimits, checkRateLimit, getClientIp } from "./security";

function req(ip = "1.2.3.4") {
  return new Request("http://localhost/api/test", { headers: { "x-forwarded-for": ip } });
}

describe("api security helpers", () => {
  it("allows up to the limit then returns 429 with Retry-After", async () => {
    __resetRateLimits();
    for (let i = 0; i < 3; i++) expect(await checkRateLimit(req(), { key: "t", limit: 3, windowMs: 60_000 })).toBeNull();
    const blocked = await checkRateLimit(req(), { key: "t", limit: 3, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("isolates buckets per client IP", async () => {
    __resetRateLimits();
    expect(await checkRateLimit(req("a"), { key: "k", limit: 1, windowMs: 60_000 })).toBeNull();
    expect(await checkRateLimit(req("a"), { key: "k", limit: 1, windowMs: 60_000 })).not.toBeNull();
    expect(await checkRateLimit(req("b"), { key: "k", limit: 1, windowMs: 60_000 })).toBeNull();
  });

  it("extracts client ip from forwarded headers", () => {
    expect(getClientIp(req("9.9.9.9, 8.8.8.8"))).toBe("9.9.9.9");
  });

  it("prefers the unspoofable Vercel edge header over x-forwarded-for", () => {
    const r = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "spoofed, 8.8.8.8", "x-vercel-forwarded-for": "1.1.1.1" },
    });
    expect(getClientIp(r)).toBe("1.1.1.1");
  });

  it("scopes buckets by user id when provided (rotation-proof)", async () => {
    __resetRateLimits();
    const spoofed = () => new Request("http://localhost/api/test", { headers: { "x-forwarded-for": `rnd-${Math.random()}` } });
    expect(await checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-1" })).toBeNull();
    // Same user, rotated IP header: still limited.
    expect(await checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-1" })).not.toBeNull();
    // Different user: fresh budget.
    expect(await checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-2" })).toBeNull();
  });

  it("warns in the learner's language with a machine-readable code", async () => {
    __resetRateLimits();
    const ru = () => new Request("http://localhost/api/test", { headers: { cookie: "linguaai_locale=ru" } });
    expect(await checkRateLimit(ru(), { key: "w", limit: 1, windowMs: 60_000 })).toBeNull();
    const blocked = await checkRateLimit(ru(), { key: "w", limit: 1, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    const j = (await blocked!.json()) as { error: string; code: string };
    expect(j.code).toBe("rate_limited");
    expect(j.error).toContain("Подождите");
  });

  it("fails open to memory when Redis is unreachable", async () => {
    __resetRateLimits();
    // No UPSTASH env in test: memory path must still limit correctly.
    expect(await checkRateLimit(req("9.9.9.9"), { key: "fallback", limit: 1, windowMs: 60_000 })).toBeNull();
    expect(await checkRateLimit(req("9.9.9.9"), { key: "fallback", limit: 1, windowMs: 60_000 })).not.toBeNull();
  });
});
