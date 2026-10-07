import { NextResponse } from "next/server";
import { getListeningTrack, toPublicListeningQuestions, dictationSentences } from "@/lib/listening/library";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const t = getListeningTrack(params.slug);
  if (!t) return NextResponse.json({ error: "Track not found." }, { status: 404 });
  const { questions: _omit, ...rest } = t;
  return NextResponse.json({
    ...rest,
    questions: toPublicListeningQuestions(t),
    dictationCount: t.dictationIndexes.length,
    // Dictation answers stay server-side; client requests them one at a time via POST /api/listening/dictation.
    dictationPreview: dictationSentences(t).map((s) => s.split(" ").length),
  });
}
