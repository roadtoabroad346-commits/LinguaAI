import { describe, expect, it } from "vitest";
import { resolveNextPath, sanitizeNext } from "./routing";

describe("sanitizeNext", () => {
  it("accepts plain relative paths", () => {
    expect(sanitizeNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeNext("/smart-path?x=1")).toBe("/smart-path?x=1");
  });
  it("rejects open redirects", () => {
    expect(sanitizeNext("https://evil.com")).toBe("/dashboard");
    expect(sanitizeNext("//evil.com/x")).toBe("/dashboard");
    expect(sanitizeNext("/\\evil")).toBe("/dashboard");
    expect(sanitizeNext("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeNext("%2F%2Fevil.com")).toBe("/dashboard");
    expect(sanitizeNext("/login")).toBe("/dashboard");
    expect(sanitizeNext("/auth/callback?x=1")).toBe("/dashboard");
  });
  it("falls back on garbage", () => {
    expect(sanitizeNext(null)).toBe("/dashboard");
    expect(sanitizeNext("")).toBe("/dashboard");
    expect(sanitizeNext("   ")).toBe("/dashboard");
  });
});

describe("resolveNextPath", () => {
  it("no profile -> onboarding", () => {
    expect(resolveNextPath(null, "/dashboard")).toBe("/onboarding");
  });
  it("partial onboarding -> onboarding", () => {
    expect(resolveNextPath({ onboarding_completed: false }, "/dashboard")).toBe("/onboarding");
  });
  it("onboarding done without placement -> placement", () => {
    expect(resolveNextPath({ onboarding_completed: true, placement_completed: false }, "/dashboard")).toBe(
      "/placement"
    );
  });
  it("legacy level counts as placement done", () => {
    expect(
      resolveNextPath({ onboarding_completed: true, level: "A2" }, "/smart-path")
    ).toBe("/smart-path");
  });
  it("both done -> safe next", () => {
    expect(
      resolveNextPath(
        { onboarding_completed: true, placement_completed: true },
        "/smart-path"
      )
    ).toBe("/smart-path");
    expect(
      resolveNextPath({ onboarding_completed: true, placement_completed: true }, "https://evil.com")
    ).toBe("/dashboard");
  });
});
