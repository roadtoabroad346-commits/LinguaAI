import { NextResponse } from "next/server";
import { updateSetSchema } from "@/lib/vocab-studio/schemas";
import { requireUser, getOwnedSet } from "@/lib/vocab-studio/server";

export const dynamic = "force-dynamic";

function toPatch(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.title !== undefined) out.title = String(p.title).trim();
  if (p.description !== undefined) out.description = String(p.description ?? "").trim();
  if (p.language !== undefined) out.language = p.language;
  if (p.nativeLanguage !== undefined) out.native_language = p.nativeLanguage;
  if (p.level !== undefined) out.level = p.level;
  if (p.category !== undefined) out.category = p.category;
  if (p.color !== undefined) out.color = p.color;
  if (p.icon !== undefined) out.icon = p.icon;
  if (p.isArchived !== undefined) out.is_archived = p.isArchived;
  if (p.isFavorite !== undefined) out.is_favorite = p.isFavorite;
  return out;
}

/** GET /api/vocab-sets/[id] — set + cards. */
export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const { data: cards } = await supabase.from("vocab_cards").select("*").eq("set_id", params.id).eq("user_id", userId).order("created_at", { ascending: true }).limit(2000);
  return NextResponse.json({ set, cards: cards ?? [] });
}

/** PATCH /api/vocab-sets/[id] — rename / edit / archive / favorite. */
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const parsed = updateSetSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update.", issues: parsed.error.flatten() }, { status: 400 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const patch = toPatch(parsed.data as unknown as Record<string, unknown>);
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  const { data, error: uErr } = await supabase.from("vocab_sets").update(patch as never).eq("id", params.id).eq("user_id", userId).select("*").maybeSingle() as any;
  if (uErr) return NextResponse.json({ error: "Could not update the set." }, { status: 500 });
  return NextResponse.json({ set: data });
}

/** DELETE /api/vocab-sets/[id] — delete set + cards (cascade). */
export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { error, supabase, userId } = await requireUser();
  if (error || !supabase || !userId) return error ?? NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { set } = await getOwnedSet(supabase, userId, params.id);
  if (!set) return NextResponse.json({ error: "Set not found." }, { status: 404 });
  const { error: dErr } = await supabase.from("vocab_sets").delete().eq("id", params.id).eq("user_id", userId);
  if (dErr) return NextResponse.json({ error: "Could not delete the set." }, { status: 500 });
  return NextResponse.json({ deleted: true, id: params.id });
}
