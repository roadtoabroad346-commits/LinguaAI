import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ attempts: [], topIssues: [], configured: false });
  try {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return NextResponse.json({ attempts: [], topIssues: [], configured: true, signedIn: false });
    const { data } = await supabase
      .from("speaking_attempts")
      .select("topic_slug,score,word_count,duration_secs,created_at")
      .eq("user_id", user.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    return NextResponse.json({ attempts: data ?? [], configured: true, signedIn: true });
  } catch {
    return NextResponse.json({ attempts: [], topIssues: [] });
  }
}
