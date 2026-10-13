import { AppShell } from "@/components/layout/AppShell";
import { StudyRunner } from "@/components/vocab-studio/StudyRunner";

export const metadata = { title: "Study session" };
export const dynamic = "force-dynamic";

export default function StudyPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <StudyRunner setId={params.id} />
    </AppShell>
  );
}
