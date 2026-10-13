import { NextResponse } from "next/server";
import { createSetSchema } from "@/lib/vocab-studio/schemas";
import { requireUser, todayKeyUTC, isMissingTableError, needsMigrationResponse } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

/** GET /api/vocab-sets — list own sets with card/due/mastery aggregates. */
export async function GET(request: Request) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = url.searchParams.get("sort") ?? "recent";
  const filter = url.searchParams.get("filter") ?? "all"; // all|favorite|archived|active
  const category = url.searchParams.get("category") ?? "all";
  const level = url.searchParams.get("level") ?? "all";

  const { data: sets, error: sErr } = await supabase
    .from("vocab_sets")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (sErr) {
    if (isMissingTableError(sErr)) return needsMigrationResponse();
    return NextResponse.json({ error: "Could not load sets." }, { status: 500 });
  }

  const { data: cards } = await supabase
    .from("vocab_cards")
    .select("id,set_id,mastery,status,next_review_at,last_reviewed_at")
    .eq("user_id", userId)
    .limit(5000);

  const today = todayKeyUTC();
  const cardRows = ((cards ?? []) as Array<Record<string, unknown>>);
  const bySet = new Map<string, Array<Record<string, unknown>>>();
  for (const c of cardRows) {
    const k = String(c.set_id);
    bySet.set(k, [...(bySet.get(k) ?? []), c]);
  }

  let list: Array<Record<string, unknown>> = ((sets ?? []) as Array<Record<string, unknown>>).map((s) => {
    const sc = bySet.get(String(s.id)) ?? [];
    const due = sc.filter((c) => !c.next_review_at || String(c.next_review_at) <= today).length;
    const mastered = sc.filter((c) => Number(c.mastery ?? 0) >= 80).length;
    const avg = sc.length > 0 ? Math.round(sc.reduce((a, c) => a + Number(c.mastery ?? 0), 0) / sc.length) : 0;
    const lastStudied = sc.reduce<string | null>((acc, c) => {
      const v = (c.last_reviewed_at as string | null) ?? null;
      if (!v) return acc;
      return !acc || v > acc ? v : acc;
    }, (s.last_studied_at as string | null) ?? null);
    return { ...s, cardCount: sc.length, dueCount: due, masteredCount: mastered, avgMastery: avg, lastStudiedAt: lastStudied };
  });

  if (filter === "favorite") list = list.filter((s) => s.is_favorite && !s.is_archived);
  else if (filter === "archived") list = list.filter((s) => s.is_archived);
  else if (filter === "active") list = list.filter((s) => !s.is_archived);
  if (category !== "all") list = list.filter((s) => String(s.category) === category);
  if (level !== "all") list = list.filter((s) => (s.level as string | null) === level);
  if (q) {
    list = list.filter((s) =>
      String(s.title ?? "").toLowerCase().includes(q) ||
      String(s.description ?? "").toLowerCase().includes(q)
    );
  }
  if (sort === "name") list.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  else if (sort === "cards") list.sort((a, b) => Number(b.cardCount) - Number(a.cardCount));
  else if (sort === "studied") list.sort((a, b) => String(b.lastStudiedAt ?? "") .localeCompare(String(a.lastStudiedAt ?? "")));
  else list.sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));

  return NextResponse.json({ sets: list, today });
}

/** POST /api/vocab-sets — create a set. */
export async function POST(request: Request) {
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = createSetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid set.", issues: parsed.error.flatten() }, { status: 400 });

  const { count } = await supabase.from("vocab_sets").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_archived", false);
  if ((count ?? 0) >= 200) return NextResponse.json({ error: "Set limit reached (200 active sets)." }, { status: 400 });

  const p = parsed.data;
  const { data, error: iErr } = await supabase.from("vocab_sets").insert({
    user_id: userId,
    title: p.title.trim(),
    description: (p.description ?? "").trim(),
    language: p.language,
    native_language: p.nativeLanguage ?? "",
    level: p.level ?? null,
    category: p.category,
    color: p.color,
    icon: p.icon,
  } as never).select("*").maybeSingle();
  if (iErr) {
    if (isMissingTableError(iErr)) return needsMigrationResponse();
    return NextResponse.json({ error: "Could not create the set." }, { status: 500 });
  }
  return NextResponse.json({ set: data }, { status: 201 });
}
