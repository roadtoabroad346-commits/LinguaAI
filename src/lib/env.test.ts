import { describe, expect, it } from "vitest";
import { isSupabaseUrlValid } from "./env";

describe("isSupabaseUrlValid", () => {
  it("accepts real project URLs", () => {
    expect(isSupabaseUrlValid("https://ekeubyepwustjhzuthkd.supabase.co")).toBe(true);
    expect(isSupabaseUrlValid("ekeubyepwustjhzuthkd.supabase.co")).toBe(true);
    expect(isSupabaseUrlValid("http://localhost:3000")).toBe(true);
  });
  it("rejects pasted JWTs and keys", () => {
    expect(isSupabaseUrlValid("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.c2ln")).toBe(false);
    expect(isSupabaseUrlValid("sb-secret-key-without-dots")).toBe(false);
    expect(isSupabaseUrlValid("not a url")).toBe(false);
  });
  it("rejects empty and non-string values", () => {
    expect(isSupabaseUrlValid("")).toBe(false);
    expect(isSupabaseUrlValid("   ")).toBe(false);
    expect(isSupabaseUrlValid(undefined)).toBe(false);
    expect(isSupabaseUrlValid(null)).toBe(false);
    expect(isSupabaseUrlValid("localhost")).toBe(false);
  });
});
