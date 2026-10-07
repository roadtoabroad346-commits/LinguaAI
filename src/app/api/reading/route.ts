import { NextResponse } from "next/server";
import { listReadingPassages, readingWordCount } from "@/lib/reading/library";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const passages = listReadingPassages(level).map((p) => ({
    slug: p.slug, level: p.level, title: p.title, minutes: p.minutes,
    words: readingWordCount(p), vocabFocus: p.vocabFocus, questionCount: p.questions.length,
  }));
  return NextResponse.json({ passages, total: passages.length });
}
