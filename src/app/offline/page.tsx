import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="bg-mesh flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardTitle className="font-display text-xl">You&apos;re offline</CardTitle>
        <CardDescription>
          Already-visited lessons stay available once you&apos;re back online. Your streak waits for you.
        </CardDescription>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/dashboard">
            <Button>Go to dashboard</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary">Home</Button>
          </Link>
        </div>
      </Card>
    </main>
  );
}
