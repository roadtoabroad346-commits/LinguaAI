import { NextResponse } from "next/server";
import { getGrammarTopic, toPublicGrammarQuestions } from "@/lib/grammar/topics";

export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const topic = getGrammarTopic(params.slug);
  if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });
  const { questions: _omit, ...lesson } = topic;
  return NextResponse.json({ ...lesson, questions: toPublicGrammarQuestions(topic) });
}
