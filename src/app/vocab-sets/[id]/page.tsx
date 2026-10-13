import { AppShell } from "@/components/layout/AppShell";
import { SetDetail } from "@/components/vocab-studio/SetDetail";

export const metadata = { title: "Vocabulary set" };
export const dynamic = "force-dynamic";

export default function SetPage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <SetDetail setId={params.id} />
    </AppShell>
  );
}
