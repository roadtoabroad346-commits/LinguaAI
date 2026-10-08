import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/api/security";
import { getPronunciationDrill, scoreFromSelfRating } from "@/lib/pronunciation/drills";
import { pronunciationCompleteSchema } from "@/lib/skills/schemas";
import { XP_RULES, xpFromBands } from "@/lib/gamification/xp-rules";
import { awardXp } from "@/lib/dashboard/award";

export async function POST(request: Request) {
  const limited = checkRateLimit(request, { key: "pronunciation", limit: 30 });
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = pronunciationCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid practice result.", issues: parsed.error.flatten() }, { status: 400 });
  }

  const drill = getPronunciationDrill(parsed.data.slug);
  if (!drill) return NextResponse.json({ error: "Drill not found." }, { status: 404 });

  const score = scoreFromSelfRating(parsed.data.rating);
  const xpEarned = xpFromBands(XP_RULES.bands.productive, score);

  let supabase = null;
  let userId: string | null = null;
  if (isSupabaseConfigured()) {
    try {
      supabase = createClient();
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
    } catch {
      supabase = null;
    }
  }
  if (!supabase || !userId) return NextResponse.json({ score, total: 100, xpEarned, saved: false });

  try {
    await supabase.from("skill_attempts").insert({
      user_id: userId,
      skill: "pronunciation",
      slug: drill.slug,
      score,
      total: 100,
      xp_earned: xpEarned,
    } as never);
  } catch {
    // Attempt history is best-effort; score + XP still count.
  }

  let streak = null;
  let xpToday = xpEarned;
  if (xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: xpEarned,
        source: "pronunciation",
        activityKind: "pronunciation",
        activityTitle: `Pronunciation: ${drill.title} — ${score}/100`,
        activityHref: `/pronunciation/${drill.slug}`,
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // Score stands even if XP fails.
    }
  }
  return NextResponse.json({ score, total: 100, xpEarned, saved: true, streak, xpToday });
}
