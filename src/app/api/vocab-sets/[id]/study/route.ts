import { NextResponse } from "next/server";
import { isCardDue } from "@/lib/vocab-studio/scheduler";
import { requireUser, getOwnedSet, todayKeyUTC } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/vocab-sets/[id]/study?mode=all|due|difficult|new&limit=50
 * Returns an ordered study queue (due first, then difficult, then new).
 */
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") ?? "due";
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50) || 50));
  const today = todayKeyUTC();

  const { data, error: cErr } = await supabase.from("vocab_cards").select("*").eq("set_id", params.id).eq("user_id", userId).limit(2000);
  if (cErr) return NextResponse.json({ error: "Could not load study queue." }, { status: 500 });
  const cards = (data ?? []) as Array<Record<string, unknown>>;

  let queue = [...cards];
  if (mode === "due") queue = queue.filter((c) => isCardDue((c.next_review_at as string | null) ?? null, today));
  else if (mode === "difficult") queue = queue.filter((c) => Number(c.lapses ?? 0) > 0 || (Number(c.review_count ?? 0) >= 2 && Number(c.mastery ?? 0) < 40));
  else if (mode === "new") queue = queue.filter((c) => c.status === "new");
  else if (mode === "unmastered") queue = queue.filter((c) => Number(c.mastery ?? 0) < 80);

  queue.sort((a, b) => {
    const aDue = isCardDue((a.next_review_at as string | null) ?? null, today) ? 0 : 1;
    const bDue = isCardDue((b.next_review_at as string | null) ?? null, today) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    return Number(a.mastery ?? 0) - Number(b.mastery ?? 0);
  });

  const total = cards.length;
  const due = cards.filter((c) => isCardDue((c.next_review_at as string | null) ?? null, today)).length;
  return NextResponse.json({ set: { id: set.id, title: set.title }, mode, today, total, due, count: Math.min(queue.length, limit), cards: queue.slice(0, limit) });
}
