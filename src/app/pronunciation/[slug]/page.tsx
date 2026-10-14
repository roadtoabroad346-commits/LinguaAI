import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getPronunciationDrill } from "@/lib/pronunciation/drills";
import { PronunciationRunner } from "@/components/pronunciation/PronunciationViews";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const drill = getPronunciationDrill(params.slug);
  return { title: drill ? `Pronunciation: ${drill.title}` : "Pronunciation" };
}

export default async function PronunciationDrillPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const drill = getPronunciationDrill(params.slug);
  if (!drill) notFound();
  return (
    <AppShell>
      <PronunciationRunner drill={drill} />
    </AppShell>
  );
}
