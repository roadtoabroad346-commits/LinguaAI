import { NextResponse } from "next/server";
import { listWritingTasks, getWritingTask } from "@/lib/writing/tasks";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const slug = url.searchParams.get("slug");
  if (slug) {
    const task = getWritingTask(slug);
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    return NextResponse.json({ task });
  }
  const tasks = listWritingTasks(level).map((t) => ({
    slug: t.slug, level: t.level, title: t.title, kind: t.kind,
    prompt: t.prompt, minWords: t.minWords, maxWords: t.maxWords,
  }));
  return NextResponse.json({ tasks, total: tasks.length });
}
