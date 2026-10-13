import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Placement history (newest first) — never overwritten, retakes append. */
export async function GET(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") || 5)));
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ signedIn: false, attempts: [] }, { headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ signedIn: false, attempts: [] }, { headers: noStore });
  }
  const { data, error } = await supabase
    .from("placement_results")
    .select("id,score,total,level,skill_scores,created_at,test_version,attempt_number")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    return NextResponse.json({ error: "Could not load placement history." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ signedIn: true, attempts: data ?? [] }, { headers: noStore });
}
