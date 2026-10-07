import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getWord, type VocabWord } from "@/lib/vocab/bank";
import { buildSpellingSet, type SpellingMode } from "@/lib/spelling/spelling";

export const dynamic = "force-dynamic";

const MODES: SpellingMode[] = ["listen", "meaning", "missing", "choice"];
const LEVELS = ["A1", "A2", "B1", "B2", "C1"] as const;

/** Deterministic spelling set. Signed-in learners get level-matched preferred words from their dictionary. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawMode = url.searchParams.get("mode") ?? "listen";
  const mode: SpellingMode = (MODES as string[]).includes(rawMode) ? (rawMode as SpellingMode) : "listen";
  const rawLevel = url.searchParams.get("level");
  const level = (LEVELS as readonly string[]).includes(rawLevel ?? "") ? (rawLevel as (typeof LEVELS)[number]) : null;
  const count = Math.max(4, Math.min(12, Number(url.searchParams.get("count") ?? 8) || 8));
  const seedKey = url.searchParams.get("seed") ?? new Date().toISOString().slice(0, 10);

  let preferred: NonNullable<Parameters<typeof buildSpellingSet>[0]["preferred"]> | undefined;
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        let q = supabase.from("dictionary_entries").select("word").eq("user_id", userData.user.id).order("mastery", { ascending: true }).limit(12);
        if (level) q = q.eq("level", level);
        const { data } = await q;
        const words = ((data ?? []) as Array<{ word: string }>)
          .map((r) => getWord(r.word))
          .filter((w): w is VocabWord => Boolean(w) && (!level || (w as VocabWord).level === level));
        if (words.length > 0) preferred = words;
      }
    } catch {
      // Preview mode — bank-only set.
    }
  }

  const set = buildSpellingSet({ seedKey, mode, level, preferred, count });
  return NextResponse.json({ ...set, seedKey });
}
