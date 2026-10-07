"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <main className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center" role="alert">
          <h1 className="text-xl font-bold">LinguaAI crashed</h1>
          <p className="text-sm text-gray-600">Please reload the page. If the problem persists, try again later.</p>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-medium text-white"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}
