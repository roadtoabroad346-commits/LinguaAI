import { describe, expect, it } from "vitest";
import { __resetRateLimits, checkRateLimit, getClientIp } from "./security";

function req(ip = "1.2.3.4") {
  return new Request("http://localhost/api/test", { headers: { "x-forwarded-for": ip } });
}

describe("api security helpers", () => {
  it("allows up to the limit then returns 429 with Retry-After", () => {
    __resetRateLimits();
    for (let i = 0; i < 3; i++) expect(checkRateLimit(req(), { key: "t", limit: 3, windowMs: 60_000 })).toBeNull();
    const blocked = checkRateLimit(req(), { key: "t", limit: 3, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
  });

  it("isolates buckets per client IP", () => {
    __resetRateLimits();
    expect(checkRateLimit(req("a"), { key: "k", limit: 1, windowMs: 60_000 })).toBeNull();
    expect(checkRateLimit(req("a"), { key: "k", limit: 1, windowMs: 60_000 })).not.toBeNull();
    expect(checkRateLimit(req("b"), { key: "k", limit: 1, windowMs: 60_000 })).toBeNull();
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

  it("scopes buckets by user id when provided (rotation-proof)", () => {
    __resetRateLimits();
    const spoofed = () => new Request("http://localhost/api/test", { headers: { "x-forwarded-for": `rnd-${Math.random()}` } });
    expect(checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-1" })).toBeNull();
    // Same user, rotated IP header: still limited.
    expect(checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-1" })).not.toBeNull();
    // Different user: fresh budget.
    expect(checkRateLimit(spoofed(), { key: "s", limit: 1, windowMs: 60_000, scope: "user-2" })).toBeNull();
  });

  it("warns in the learner's language with a machine-readable code", () => {
    __resetRateLimits();
    const ru = () => new Request("http://localhost/api/test", { headers: { cookie: "linguaai_locale=ru" } });
    expect(checkRateLimit(ru(), { key: "w", limit: 1, windowMs: 60_000 })).toBeNull();
    const blocked = checkRateLimit(ru(), { key: "w", limit: 1, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    return blocked!.json().then((j: { error: string; code: string }) => {
      expect(j.code).toBe("rate_limited");
      expect(j.error).toContain("Подождите");
    });
  });
});
