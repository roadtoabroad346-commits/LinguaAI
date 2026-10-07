import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

/** Recent submissions + top error categories (error tracking for Smart Path later). */
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false, submissions: [], topErrors: [] });
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id ?? null;
    if (!userId) return NextResponse.json({ signedIn: false, submissions: [], topErrors: [] });

    const { data: subs } = await supabase.from("writing_submissions")
      .select("id,task_slug,level,word_count,score,xp_earned,ai,created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
    const { data: errs } = await supabase.from("writing_errors")
      .select("category,message").eq("user_id", userId).order("created_at", { ascending: false }).limit(50);

    const counts: Record<string, number> = {};
    for (const e of ((errs ?? []) as Array<{ category: string }>)) counts[e.category] = (counts[e.category] ?? 0) + 1;
    const topErrors = Object.entries(counts).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

    return NextResponse.json({ signedIn: true, submissions: subs ?? [], topErrors });
  } catch {
    return NextResponse.json({ error: "Could not load history." }, { status: 500 });
  }
}
