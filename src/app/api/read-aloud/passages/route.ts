import { NextResponse } from "next/server";
import { listReadAloudPassages, getReadAloudPassage } from "@/lib/readaloud/passages";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") ?? "all";
  const slug = url.searchParams.get("slug");
  if (slug) {
    const passage = getReadAloudPassage(slug);
    if (!passage) return NextResponse.json({ error: "Passage not found." }, { status: 404 });
    return NextResponse.json({ passage });
  }
  const passages = listReadAloudPassages(level).map((p) => ({
    slug: p.slug, level: p.level, title: p.title, text: p.text, focus: p.focus,
    words: p.text.trim().split(/\s+/).length,
  }));
  return NextResponse.json({ passages, total: passages.length });
}
