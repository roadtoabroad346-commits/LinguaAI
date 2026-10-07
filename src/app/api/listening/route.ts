import { NextResponse } from "next/server";
import { listListeningTracks } from "@/lib/listening/library";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const kind = url.searchParams.get("kind") ?? "all";
  const tracks = listListeningTracks(level, kind).map((t) => ({
    slug: t.slug, level: t.level, title: t.title, kind: t.kind,
    minutes: t.minutes, summary: t.summary, lineCount: t.lines.length,
    vocabFocus: t.vocabFocus, questionCount: t.questions.length,
    dictationCount: t.dictationIndexes.length,
  }));
  return NextResponse.json({ tracks, total: tracks.length });
}
