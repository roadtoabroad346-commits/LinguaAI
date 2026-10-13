import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { placementDraftUpsertSchema } from "@/lib/auth/schemas";
import { checkRateLimit } from "@/lib/api/security";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

/** GET /api/placement/draft — latest in-progress server draft (authoritative when signed in). */
export async function GET() {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ signedIn: false, draft: null }, { headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ signedIn: false, draft: null }, { headers: noStore });

  const { data, error } = await supabase
    .from("placement_drafts")
    .select("attempt_key,section_index,payload,updated_at,created_at")
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    // Table missing on old backends (pre-0022): explicit empty, client falls back to local.
    if (/column|schema cache|relation.*does not exist|0022/i.test(error.message)) {
      return NextResponse.json({ signedIn: true, draft: null, unsupported: true }, { headers: noStore });
    }
    return NextResponse.json({ error: "Could not load draft." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ signedIn: true, draft: data ?? null }, { headers: noStore });
}

/** PUT /api/placement/draft — upsert in-progress draft (server wins on completed results, never grades). */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = placementDraftUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid draft.", issues: parsed.error.flatten() },
      { status: 400, headers: noStore }
    );
  }
  const limited = await checkRateLimit(request, { key: "placement-draft", limit: 30 });
  if (limited) return limited;

  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Backend not configured." }, { status: 503, headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401, headers: noStore });

  const { attemptKey, sectionIndex, payload } = parsed.data;
  const { data, error } = await supabase
    .from("placement_drafts")
    .upsert(
      {
        user_id: user.id,
        attempt_key: attemptKey.slice(0, 120),
        status: "in_progress",
        section_index: sectionIndex,
        payload: payload as unknown as Record<string, unknown>,
      } as never,
      { onConflict: "user_id,attempt_key" }
    )
    .select("attempt_key,updated_at")
    .maybeSingle();
  if (error) {
    if (/column|schema cache|relation.*does not exist|0022/i.test(error.message)) {
      return NextResponse.json(
        { saved: false, unsupported: true, error: "Apply 0022_placement_drafts.sql in Supabase." },
        { status: 503, headers: noStore }
      );
    }
    return NextResponse.json({ error: "Could not save draft." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ saved: true, draft: data ?? null }, { headers: noStore });
}

/** DELETE /api/placement/draft — discard in-progress draft (explicit user action or post-submit cleanup). */
export async function DELETE(request: Request) {
  let attemptKey = "";
  try {
    const url = new URL(request.url);
    attemptKey = url.searchParams.get("attemptKey") ?? "";
    if (!attemptKey) {
      const body = (await request.json().catch(() => null)) as { attemptKey?: unknown } | null;
      if (typeof body?.attemptKey === "string") attemptKey = body.attemptKey;
    }
  } catch {
    /* noop */
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ deleted: false }, { headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return NextResponse.json({ deleted: false }, { headers: noStore });

  try {
    if (attemptKey.trim().length >= 4) {
      await supabase
        .from("placement_drafts")
        .delete()
        .eq("user_id", user.id)
        .eq("attempt_key", attemptKey.trim().slice(0, 120));
    } else {
      await supabase.from("placement_drafts").delete().eq("user_id", user.id).eq("status", "in_progress");
    }
  } catch {
    /* best-effort */
  }
  return NextResponse.json({ deleted: true }, { headers: noStore });
}
