import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getReadingPassage, gradeReadingSelections } from "@/lib/reading/library";
import { readingCompleteSchema } from "@/lib/skills/schemas";
import { awardXp } from "@/lib/dashboard/award";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = readingCompleteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid answers.", issues: parsed.error.flatten() }, { status: 400 });

  const passage = getReadingPassage(parsed.data.slug);
  if (!passage) return NextResponse.json({ error: "Passage not found." }, { status: 404 });
  const grade = gradeReadingSelections(passage, parsed.data.selections);

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
      user_id: userId, skill: "reading", slug: passage.slug,
      score: grade.score, total: grade.total, xp_earned: grade.xpEarned,
    } as never);
  } catch {
    // Best-effort history.
  }

  let streak = null;
  let xpToday = grade.xpEarned;
  if (grade.xpEarned > 0) {
    try {
      const res = await awardXp(supabase, userId, {
        amount: grade.xpEarned, source: "reading",
        activityKind: "reading", activityTitle: `Reading: ${passage.title} — ${grade.score}/${grade.total}`,
        activityHref: `/reading/${passage.slug}`,
      });
      streak = res.streak;
      xpToday = res.xpToday;
    } catch {
      // Grade stands.
    }
  }
  return NextResponse.json({ ...grade, saved: true, streak, xpToday });
}
