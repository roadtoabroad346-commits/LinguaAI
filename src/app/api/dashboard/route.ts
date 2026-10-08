import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard/queries";

/** Aggregated dashboard payload (streak, XP, activity, word, recommendations, challenge status). */
export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 });
  }
}

export async function POST() {
  // Allow refresh via POST too (client revalidation pattern).
  try {
    const supabase = createClient();
    await supabase.auth.getUser();
    const data = await getDashboardData();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load dashboard." }, { status: 500 });
  }
}
