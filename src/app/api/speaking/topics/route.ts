import { NextResponse } from "next/server";
import { listSpeakingTopics, getSpeakingTopic } from "@/lib/speaking/topics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const slug = url.searchParams.get("slug");
  if (slug) {
    const topic = getSpeakingTopic(slug);
    if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
    return NextResponse.json({ topic });
  }
  const topics = listSpeakingTopics(level).map((t) => ({
    slug: t.slug, level: t.level, title: t.title, prompt: t.prompt,
    questions: t.questions, minWords: t.minWords, targetSecs: t.targetSecs,
    usefulPhrases: t.usefulPhrases,
  }));
  return NextResponse.json({ topics, total: topics.length });
}
