import { AppShell } from "@/components/layout/AppShell";
import { StudyRunner } from "@/components/vocab-studio/StudyRunner";

export const metadata = { title: "Study session" };
export const dynamic = "force-dynamic";

export default async function StudyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <AppShell>
      <StudyRunner setId={params.id} />
    </AppShell>
  );
}
