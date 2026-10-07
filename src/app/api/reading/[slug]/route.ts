import { NextResponse } from "next/server";
import { getReadingPassage, toPublicReadingQuestions, readingWordCount } from "@/lib/reading/library";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const p = getReadingPassage(params.slug);
  if (!p) return NextResponse.json({ error: "Passage not found." }, { status: 404 });
  const { questions: _omit, ...rest } = p;
  return NextResponse.json({ ...rest, words: readingWordCount(p), questions: toPublicReadingQuestions(p) });
}
