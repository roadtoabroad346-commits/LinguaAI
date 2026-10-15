import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase RPC binding", () => {
  it("does not detach rpc methods from their clients", () => {
    const files = [
      "src/app/api/practice/session/route.ts",
      "src/lib/dashboard/award.ts",
    ];

    for (const file of files) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/const\s+\w+\s*=\s*\w+\.rpc\b/);
    }
  });
});
