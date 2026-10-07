import { NextResponse } from "next/server";
import { VOCAB_BANK, searchWords } from "@/lib/vocab/bank";
import type { Level } from "@/types/database";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

/** Public vocabulary bank with deterministic search + filters. No auth needed. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const levelParam = url.searchParams.get("level") ?? "all";
  const posParam = url.searchParams.get("pos") ?? "all";
  const level = (LEVELS.includes(levelParam as Level) ? levelParam : "all") as Level | "all";
  const pos = (["noun", "verb", "adjective", "adverb"].includes(posParam) ? posParam : "all") as
    | "noun" | "verb" | "adjective" | "adverb" | "all";

  const words = searchWords({ q, level, pos });
  return NextResponse.json({ total: VOCAB_BANK.length, count: words.length, words });
}
