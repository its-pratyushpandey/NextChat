"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-dvh items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-xl border bg-card p-6">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {error.message}
            </p>
            <div className="mt-6 flex gap-2">
              <Button onClick={reset}>Try again</Button>
              <Button variant="outline" onClick={() => location.assign("/")}
              >
                Home
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
