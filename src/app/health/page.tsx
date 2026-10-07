import { Header } from "@/components/layout/Header";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/feedback";
export const metadata = { title: "System status" };
export default function HealthPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <Card>
          <CardTitle>System status</CardTitle>
          <CardDescription>Phase 0 foundation checks. Live JSON at <code>/api/health</code>.</CardDescription>
          <div className="mt-4 text-sm text-ink-600">
            <p>Start the dev server (<code>npm run dev</code>) and open <code>/api/health</code> for live service status.</p>
            <p className="mt-2">Expected keys: <Badge>supabase</Badge> <Badge>gemini</Badge> each <Badge tone="warning">missing</Badge> until env is set.</p>
          </div>
        </Card>
      </main>
    </div>
  );
}
