import { NextResponse } from "next/server";
import { listGrammarTopics } from "@/lib/grammar/topics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const topics = listGrammarTopics(level).map((t) => ({
    slug: t.slug, level: t.level, title: t.title, summary: t.summary, questionCount: t.questions.length,
  }));
  return NextResponse.json({ topics, total: topics.length });
}
