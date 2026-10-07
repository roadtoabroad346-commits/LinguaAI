import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getWord } from "@/lib/vocab/bank";
import { gradePracticeByWord } from "@/lib/vocab/practice";
import { applyPracticeResult, masteryBand, nextReviewDate } from "@/lib/vocab/mastery";
import { practiceCompleteSchema } from "@/lib/vocab/schemas";
import { awardXp } from "@/lib/dashboard/award";

/**
 * Grade a practice attempt by matching chosen definitions against the bank
 * (client never holds answers). Signed-in learners get mastery updates + XP.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = practiceCompleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers.", issues: parsed.error.flatten() }, { status: 400 });

  const grade = gradePracticeByWord(parsed.data.selections);

  let supabase = null;
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      supabase = null;
    }
  }
  if (!supabase || !userId) {
    return NextResponse.json({ ...grade, saved: false, xpEarned: grade.xpEarned });
  }

  // Gentle mastery nudge for saved words that appeared in the quiz.
  const correctSet = new Set(grade.correctWords);
  for (const s of parsed.data.selections) {
    const entry = getWord(s.word);
    if (!entry) continue;
    const { data: row } = await supabase
      .from("dictionary_entries")
      .select("mastery,review_count,correct_count")
      .eq("user_id", userId)
      .eq("word", entry.slug)
      .maybeSingle();
    if (!row) continue;
    const prev = row as { mastery: number; review_count: number; correct_count: number };
    const correct = correctSet.has(entry.slug);
    const mastery = applyPracticeResult(prev.mastery ?? 0, correct);
    await supabase.from("dictionary_entries").update({
      mastery,
      review_count: (prev.review_count ?? 0) + 1,
      correct_count: (prev.correct_count ?? 0) + (correct ? 1 : 0),
      last_reviewed_at: new Date().toISOString(),
      next_review_at: nextReviewDate(mastery),
    } as never).eq("user_id", userId).eq("word", entry.slug);
  }

  let streak = null;
  let xpToday = grade.xpEarned;
  if (grade.xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: grade.xpEarned,
        source: "vocab_practice",
        activityKind: "vocab_practice",
        activityTitle: `Vocabulary practice — ${grade.score}/${grade.total}`,
        activityHref: "/vocabulary/practice",
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // Grade stands even if XP fails.
    }
  }

  return NextResponse.json({ ...grade, saved: true, masteryUpdates: true, band: masteryBand(80), streak, xpToday });
}
