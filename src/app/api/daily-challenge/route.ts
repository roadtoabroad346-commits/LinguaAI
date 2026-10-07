import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getDailyChallenge, toPublicChallenge } from "@/lib/dashboard/daily-challenge";
import { todayKeyTz } from "@/lib/dashboard/streak";

/** Today's challenge (public questions only — answers stay server-side). Date key follows the learner's timezone. */
export async function GET(request: Request) {
  const url = new URL(request.url);

  let level = null;
  let timezone = "UTC";
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase.from("profiles").select("level,timezone").eq("id", userData.user.id).maybeSingle();
        level = ((profile ?? {}) as { level: null }).level ?? null;
        timezone = ((profile ?? {}) as { timezone?: string | null }).timezone ?? "UTC";
        const dateKey = url.searchParams.get("date") ?? todayKeyTz(new Date(), timezone);
        const { data: done } = await supabase
          .from("daily_challenge_completions")
          .select("score,total,xp_earned")
          .eq("user_id", userData.user.id)
          .eq("challenge_date", dateKey)
          .maybeSingle();
        const challenge = getDailyChallenge(dateKey, level as never);
        return NextResponse.json({ ...toPublicChallenge(challenge), completed: done ?? null });
      }
    } catch {
      // fall through to anonymous challenge
    }
  }
  const dateKey = url.searchParams.get("date") ?? todayKeyTz(new Date(), timezone);
  const challenge = getDailyChallenge(dateKey, null);
  return NextResponse.json({ ...toPublicChallenge(challenge), completed: null });
}
