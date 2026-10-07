import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { awardXp } from "@/lib/dashboard/award";
import { applyReview, nextReviewDate, masteryBand, reviewXp } from "@/lib/vocab/mastery";
import { flashReviewSchema } from "@/lib/vocab/schemas";

/** Record one flashcard review: updates mastery + schedule, awards XP. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = flashReviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review.", issues: parsed.error.flatten() }, { status: 400 });

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Backend not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) return NextResponse.json({ error: "Sign in to save reviews." }, { status: 401 });

  const slug = parsed.data.word.trim().toLowerCase();
  const { data: row } = await supabase
    .from("dictionary_entries")
    .select("mastery,review_count,correct_count")
    .eq("user_id", userId)
    .eq("word", slug)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Word is not in your dictionary." }, { status: 404 });

  const prev = row as { mastery: number; review_count: number; correct_count: number };
  const mastery = applyReview(prev.mastery ?? 0, parsed.data.known);
  const next = nextReviewDate(mastery);
  const { error: updateError } = await supabase
    .from("dictionary_entries")
    .update({
      mastery,
      review_count: (prev.review_count ?? 0) + 1,
      correct_count: (prev.correct_count ?? 0) + (parsed.data.known ? 1 : 0),
      last_reviewed_at: new Date().toISOString(),
      next_review_at: next,
    } as never)
    .eq("user_id", userId)
    .eq("word", slug);
  if (updateError) return NextResponse.json({ error: "Could not save the review." }, { status: 500 });

  const xp = reviewXp(parsed.data.known);
  let streak = null;
  let xpToday = xp;
  try {
    const res = await awardXp(supabase, userId, {
      amount: xp,
      source: "flashcards",
      activityKind: "flashcards",
      activityTitle: `Flashcards — ${slug} (${parsed.data.known ? "known" : "review"})`,
      activityHref: "/flashcards",
    });
    streak = res.streak;
    xpToday = res.xpToday;
  } catch {
    // Review is saved; XP failure is non-fatal.
  }

  return NextResponse.json({ saved: true, word: slug, mastery, band: masteryBand(mastery), nextReview: next, xpAwarded: xp, xpToday, streak });
}
