import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isValidDailyGoal } from "@/lib/gamification/gamification";

const schema = z.object({ dailyGoalXp: z.number().int().min(10).max(200) });

/** Quick daily-goal setter used by the Progress page (full profile editing stays in /profile). */
export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !isValidDailyGoal(parsed.data.dailyGoalXp)) {
    return NextResponse.json({ error: "Daily goal must be an integer between 10 and 200 XP." }, { status: 400 });
  }
  if (!isValidDailyGoal(parsed.data.dailyGoalXp)) {
    return NextResponse.json({ error: "Invalid daily goal." }, { status: 400 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const { error } = await supabase.from("profiles").update({ daily_goal_xp: parsed.data.dailyGoalXp } as never).eq("id", userData.user.id);
  if (error) return NextResponse.json({ error: "Could not save the goal." }, { status: 500 });
  return NextResponse.json({ ok: true, dailyGoalXp: parsed.data.dailyGoalXp });
}
