import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { xpAwardSchema } from "@/lib/dashboard/schemas";
import { awardXp } from "@/lib/dashboard/award";

/** Generic XP endpoint for learning modules (vocab, grammar … land in later phases). */
export async function POST(request: Request) {
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = xpAwardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid XP payload.", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await awardXp(supabase, userData.user.id, {
      amount: parsed.data.amount,
      source: parsed.data.source,
      activityKind: parsed.data.activityKind,
      activityTitle: parsed.data.activityTitle,
      activityHref: parsed.data.activityHref,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json({ error: "Could not record XP." }, { status: 500 });
  }
}
