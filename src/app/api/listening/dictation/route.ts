import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { getListeningTrack, gradeDictation, DICTATION_XP } from "@/lib/listening/library";
import { dictationSchema } from "@/lib/skills/schemas";
import { awardXp } from "@/lib/dashboard/award";

/**
 * Dictation grading. The expected sentence never leaves the server in bulk:
 * the client submits one typed sentence at a time and gets exact/similarity back.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = dictationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid dictation.", issues: parsed.error.flatten() }, { status: 400 });

  const track = getListeningTrack(parsed.data.slug);
  if (!track) return NextResponse.json({ error: "Track not found." }, { status: 404 });
  const expected = track.lines[parsed.data.index]?.text;
  if (!expected || !track.dictationIndexes.includes(parsed.data.index)) {
    return NextResponse.json({ error: "Dictation sentence not found." }, { status: 404 });
  }

  const { exact, similarity } = gradeDictation(expected, parsed.data.text);
  const xpEarned = exact ? DICTATION_XP : 0;

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
  if (!supabase || !userId) return NextResponse.json({ exact, similarity, xpEarned, saved: false });

  if (exact) {
    try {
      await supabase.from("skill_attempts").insert({
        user_id: userId, skill: "dictation", slug: `${track.slug}#${parsed.data.index}`,
        score: 1, total: 1, xp_earned: xpEarned,
      } as never);
      const res = await awardXp(supabase, userId, {
        amount: xpEarned, source: "dictation",
        activityKind: "listening", activityTitle: `Dictation: ${track.title}`,
        activityHref: `/listening/${track.slug}`,
      });
      return NextResponse.json({ exact, similarity, xpEarned, saved: true, streak: res.streak, xpToday: res.xpToday });
    } catch {
      return NextResponse.json({ exact, similarity, xpEarned, saved: true });
    }
  }
  return NextResponse.json({ exact, similarity, xpEarned, saved: true, hint: "Listen again and try once more — punctuation is ignored." });
}
