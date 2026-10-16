import { NextResponse } from "next/server";
import { getGrammarTopic, toPublicGrammarQuestions } from "@/lib/grammar/topics";

export async function GET(_request: Request, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const topic = getGrammarTopic(params.slug);
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  const { questions, ...lesson } = topic;
  void questions;
  return NextResponse.json({ ...lesson, questions: toPublicGrammarQuestions(topic) });
}
