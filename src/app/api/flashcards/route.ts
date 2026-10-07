import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { todayKey } from "@/lib/dashboard/streak";
import { VOCAB_BANK } from "@/lib/vocab/bank";
import { isDue, masteryBand } from "@/lib/vocab/mastery";

export const dynamic = "force-dynamic";

/** Flashcard deck: due saved words first, then newest. Preview deck when signed out. */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      configured: false, signedIn: false,
      cards: VOCAB_BANK.filter((w) => w.level === "A1").slice(0, 10).map((w) => ({ ...w, mastery: 0, band: "new" as const })),
    });
  }
  let supabase;
  try {
    supabase = createClient();
  } catch {
    return NextResponse.json({ configured: false, signedIn: false, cards: [] });
  }
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  if (!userId) {
    return NextResponse.json({
      configured: true, signedIn: false,
      cards: VOCAB_BANK.filter((w) => w.level === "A1").slice(0, 10).map((w) => ({ ...w, mastery: 0, band: "new" as const })),
    });
  }
  const { data, error } = await supabase
    .from("dictionary_entries")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Could not load flashcards." }, { status: 500 });

  const today = todayKey();
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const cards = rows.map((r) => {
    const slug = String(r.word ?? "");
    const bank = VOCAB_BANK.find((w) => w.slug === slug);
    const mastery = Number(r.mastery ?? 0);
    return {
      slug,
      word: slug,
      partOfSpeech: (r.part_of_speech as string) ?? bank?.partOfSpeech ?? "noun",
      level: (r.level as string) ?? bank?.level ?? "A1",
      definition: (r.definition as string) ?? bank?.definition ?? "",
      example: (r.example as string) ?? bank?.example ?? "",
      phonetic: (r.phonetic as string) ?? bank?.phonetic ?? "",
      translation: (r.translation as string | null) ?? null,
      mastery,
      band: masteryBand(mastery),
      due: isDue((r.next_review_at as string | null) ?? null, today),
    };
  });
  cards.sort((a, b) => Number(b.due) - Number(a.due));
  const dueCount = cards.filter((c) => c.due).length;
  return NextResponse.json({ configured: true, signedIn: true, total: cards.length, due: dueCount, today, cards });
}
