import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { VOCAB_BANK, getWord } from "@/lib/vocab/bank";
import { buildPracticeSet, toPublicPracticeSet } from "@/lib/vocab/practice";
import type { Level } from "@/types/database";

/**
 * Practice set built from saved low-mastery words first, filled from the
 * learner's level band. Answers stay server-side; grading happens on complete.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const seedKey = url.searchParams.get("seed") ?? `${Date.now()}`;

  let level: Level | null = null;
  let preferred: typeof VOCAB_BANK = [];
  let signedIn = false;

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (userId) {
        signedIn = true;
        const { data: profile } = await supabase.from("profiles").select("level").eq("id", userId).maybeSingle();
        level = (((profile ?? {}) as { level: Level | null }).level ?? null) as Level | null;
        const { data: entries } = await supabase
          .from("dictionary_entries")
          .select("word,mastery")
          .eq("user_id", userId)
          .order("mastery", { ascending: true })
          .limit(30);
        const slugs = ((entries ?? []) as Array<{ word: string; mastery: number }>)
          .filter((e) => (e.mastery ?? 0) < 80)
          .map((e) => e.word);
        preferred = slugs.map((s) => getWord(s)).filter((w): w is (typeof VOCAB_BANK)[number] => w !== null);
      }
    } catch {
      // Preview fallback below.
    }
  }

  const set = buildPracticeSet({ seedKey, level, preferred, count: 8 });
  return NextResponse.json({ ...toPublicPracticeSet(set), seed: seedKey, level: level ?? "mixed", signedIn });
}
