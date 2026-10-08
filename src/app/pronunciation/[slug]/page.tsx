import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getPronunciationDrill } from "@/lib/pronunciation/drills";
import { PronunciationRunner } from "@/components/pronunciation/PronunciationViews";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { slug: string } }) {
  const drill = getPronunciationDrill(params.slug);
  return { title: drill ? `Pronunciation: ${drill.title}` : "Pronunciation" };
}

export default function PronunciationDrillPage({ params }: { params: { slug: string } }) {
  const drill = getPronunciationDrill(params.slug);
  if (!drill) notFound();
  return (
    <AppShell>
      <PronunciationRunner drill={drill} />
    </AppShell>
  );
}
