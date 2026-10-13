import { NextResponse } from "next/server";
import { computeStudioStats } from "@/lib/vocab-studio/analytics";
import { requireUser, todayKeyUTC } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

/** GET /api/vocab-studio/stats — real persisted analytics (never fabricated). */
export async function GET() {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const today = todayKeyUTC();
  const weekAgo = new Date(`${today}T00:00:00Z`);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

  const [cardsRes, revRes, setsRes] = await Promise.all([
    supabase.from("vocab_cards").select("id,set_id,mastery,status,review_count,correct_count,lapses,next_review_at,last_reviewed_at,created_at").eq("user_id", userId).limit(5000),
    supabase.from("vocab_reviews").select("card_id,correct,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(2000),
    supabase.from("vocab_sets").select("id,title,color,is_archived").eq("user_id", userId).limit(500),
  ]);
  if (cardsRes.error) return NextResponse.json({ error: "Could not load stats." }, { status: 500 });

  const cards = ((cardsRes.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
    id: String(c.id), set_id: String(c.set_id),
    mastery: Number(c.mastery ?? 0), status: String(c.status ?? "new"),
    review_count: Number(c.review_count ?? 0), correct_count: Number(c.correct_count ?? 0),
    lapses: Number(c.lapses ?? 0),
    next_review_at: (c.next_review_at as string | null) ?? null,
    last_reviewed_at: (c.last_reviewed_at as string | null) ?? null,
    created_at: String(c.created_at ?? ""),
  }));
  const reviews = ((revRes.data ?? []) as Array<{ card_id: string; correct: boolean; created_at: string }>);
  const stats = computeStudioStats(cards, reviews, today);

  // Attach set titles for bySet + difficult card words (single extra query, bounded).
  const setTitles = new Map<string, string>();
  for (const s of ((setsRes.data ?? []) as Array<Record<string, unknown>>)) setTitles.set(String(s.id), String(s.title ?? ""));
  const bySet = stats.bySet.map((b) => ({ ...b, title: setTitles.get(b.setId) ?? b.setId }));

  let difficult: Array<Record<string, unknown>> = [];
  if (stats.difficultWords.length > 0) {
    const ids = stats.difficultWords.map((d) => d.cardId).slice(0, 20);
    const { data } = await supabase.from("vocab_cards").select("id,word,front,set_id,mastery,lapses").in("id", ids).eq("user_id", userId);
    difficult = ((data ?? []) as Array<Record<string, unknown>>).map((c) => ({ ...c, setTitle: setTitles.get(String(c.set_id)) ?? "" }));
  }

  return NextResponse.json({
    today,
    masteryCriteria: "mastered = mastery ≥ 80 AND review_count ≥ 3 AND accuracy ≥ 75%. Views never count as mastery.",
    stats: { ...stats, bySet },
    difficult,
    sets: (setsRes.data ?? []).length,
  });
}
