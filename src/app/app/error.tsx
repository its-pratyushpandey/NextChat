"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Chat error</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" onClick={() => location.assign("/app")}
          >
            Back to chats
          </Button>
        </div>
      </div>
    </div>
  );
}
