import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("client response parsing", () => {
  it("routes every client-side JSON response through readJson", () => {
    const root = resolve(process.cwd(), "src");
    const offenders = readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(?:ts|tsx)$/.test(file))
      .filter((file) => {
        const source = readFileSync(resolve(root, file), "utf8");
        return source.startsWith('"use client"') && /\.json\(\)/.test(source);
      });

    expect(offenders).toEqual([]);
  });
});

