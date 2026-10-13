import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Latest completed placement attempt for the signed-in user (authoritative result). */
export async function GET() {
  const noStore = { "Cache-Control": "no-store" };
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ signedIn: false, attempt: null }, { headers: noStore });
  }
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ signedIn: false, attempt: null }, { headers: noStore });
  }
  const { data, error } = await supabase
    .from("placement_results")
    .select("id,score,total,level,skill_scores,answers,created_at,test_version,attempt_number,duration_seconds")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Could not load placement result." }, { status: 500, headers: noStore });
  }
  return NextResponse.json({ signedIn: true, attempt: data ?? null }, { headers: noStore });
}
