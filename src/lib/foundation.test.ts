import { describe, it, expect } from "vitest";
import { deterministicFallback } from "@/lib/gemini/client";
import { cn } from "@/lib/utils";
describe("phase 0 foundation", () => {
  it("merges tailwind classes deterministically", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
  it("gemini fallback is deterministic", () => {
    expect(deterministicFallback("writing")).toContain("deterministic:writing");
  });
});
