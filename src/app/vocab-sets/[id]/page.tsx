import { AppShell } from "@/components/layout/AppShell";
import { SetDetail } from "@/components/vocab-studio/SetDetail";

export const metadata = { title: "Vocabulary set" };
export const dynamic = "force-dynamic";

export default async function SetPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return (
    <AppShell>
      <SetDetail setId={params.id} />
    </AppShell>
  );
}
