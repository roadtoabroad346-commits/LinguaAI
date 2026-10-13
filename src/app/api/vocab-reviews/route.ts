import { NextResponse } from "next/server";
import { reviewSubmitSchema } from "@/lib/vocab-studio/schemas";
import { rateCard, xpForRating, type CardStatus } from "@/lib/vocab-studio/scheduler";
import { requireUser } from "@/lib/vocab-studio/server";
import { checkRateLimit } from "@/lib/api/security";
import { awardXp } from "@/lib/dashboard/award";

export const dynamic = "force-dynamic";

/**
 * POST /api/vocab-reviews — idempotent graded review.
 * Body: { cardId, rating (again|hard|good|easy|known|unknown), idempotencyKey, durationMs? }
 * - Verifies card ownership (user_id + set ownership).
 * - Dedupes on (user_id, idempotency_key): repeat POST returns the original result.
 * - Applies FSRS-lite scheduling, persists vocab_reviews + card state, awards XP once.
 */
export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = reviewSubmitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid review.", issues: parsed.error.flatten() }, { status: 400 });
  const { cardId, rating, idempotencyKey } = parsed.data;

  const userLimited = checkRateLimit(request, { key: "vocab-reviews", limit: 120, scope: userId });
  if (userLimited) return userLimited;

  // Idempotency: return prior result without double-counting XP/scheduling.
  const { data: prior } = await supabase.from("vocab_reviews").select("*").eq("user_id", userId).eq("idempotency_key", idempotencyKey).maybeSingle();
  if (prior) {
    const p = prior as Record<string, unknown>;
    return NextResponse.json({ saved: true, deduped: true, review: p, newMastery: p.new_mastery, newInterval: p.new_interval });
  }

  const { data: card } = await supabase.from("vocab_cards").select("*").eq("id", cardId).eq("user_id", userId).maybeSingle();
  if (!card) return NextResponse.json({ error: "Card not found." }, { status: 404 });
  const c = card as Record<string, unknown>;
  const setId = String(c.set_id);

  const next = rateCard({
    status: (c.status as CardStatus) ?? "new",
    mastery: Number(c.mastery ?? 0),
    easeFactor: Number(c.ease_factor ?? 2.5),
    intervalDays: Number(c.interval_days ?? 0),
    reviewCount: Number(c.review_count ?? 0),
    correctCount: Number(c.correct_count ?? 0),
    lapses: Number(c.lapses ?? 0),
  }, rating);

  const nowIso = new Date().toISOString();
  const { data: review, error: rErr } = await supabase.from("vocab_reviews").insert({
    user_id: userId, card_id: cardId, set_id: setId,
    rating, correct: next.correct,
    prev_mastery: Number(c.mastery ?? 0), new_mastery: next.mastery,
    prev_interval: Number(c.interval_days ?? 0), new_interval: next.intervalDays,
    idempotency_key: idempotencyKey,
  } as never).select("*").maybeSingle() as any;
  if (rErr) {
    // Race: another request won the idempotency slot — return it.
    const { data: raced } = await supabase.from("vocab_reviews").select("*").eq("user_id", userId).eq("idempotency_key", idempotencyKey).maybeSingle();
    if (raced) return NextResponse.json({ saved: true, deduped: true, review: raced });
    return NextResponse.json({ error: "Could not save the review." }, { status: 500 });
  }

  const { error: uErr } = await supabase.from("vocab_cards").update({
    status: next.status, mastery: next.mastery, ease_factor: next.easeFactor,
    interval_days: next.intervalDays, review_count: next.reviewCount,
    correct_count: next.correctCount, lapses: next.lapses,
    last_reviewed_at: nowIso, next_review_at: next.nextReviewAt,
  } as never).eq("id", cardId).eq("user_id", userId);
  if (uErr) return NextResponse.json({ error: "Review saved but scheduling failed — retry." }, { status: 500 });

  await supabase.from("vocab_sets").update({ last_studied_at: nowIso } as never).eq("id", setId).eq("user_id", userId);

  const xp = xpForRating(rating);
  let streak: unknown = null, xpToday: number = xp;
  try {
    const res = await awardXp(supabase, userId, {
      amount: xp, source: "vocab-studio",
      activityKind: "vocab-studio", activityTitle: `Vocab Studio — ${rating} (${next.mastery}%)`,
      activityHref: `/vocab-sets/${setId}/study`,
    });
    streak = res.streak; xpToday = res.xpToday;
  } catch { /* review is saved; XP failure non-fatal */ }

  return NextResponse.json({
    saved: true, review,
    newMastery: next.mastery, newStatus: next.status,
    newInterval: next.intervalDays, nextReviewAt: next.nextReviewAt,
    correct: next.correct, xpAwarded: xp, xpToday, streak,
  }, { status: 201 });
}
