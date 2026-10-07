import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getGrammarTopic, gradeGrammarSelections } from "@/lib/grammar/topics";
import { grammarCompleteSchema } from "@/lib/skills/schemas";
import { awardXp } from "@/lib/dashboard/award";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = grammarCompleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers.", issues: parsed.error.flatten() }, { status: 400 });

  const topic = getGrammarTopic(parsed.data.slug);
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  const grade = gradeGrammarSelections(topic, parsed.data.selections);

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
  if (!supabase || !userId) return NextResponse.json({ ...grade, saved: false });

  try {
    await supabase.from("skill_attempts").insert({
      user_id: userId, skill: "grammar", slug: topic.slug,
      score: grade.score, total: grade.total, xp_earned: grade.xpEarned,
    } as never);
  } catch {
    // Attempt history is best-effort; grade + XP still count.
  }

  let streak = null;
  let xpToday = grade.xpEarned;
  if (grade.xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: grade.xpEarned, source: "grammar",
        activityKind: "grammar", activityTitle: `Grammar: ${topic.title} — ${grade.score}/${grade.total}`,
        activityHref: `/grammar/${topic.slug}`,
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // Grade stands even if XP fails.
    }
  }
  return NextResponse.json({ ...grade, saved: true, streak, xpToday });
}
