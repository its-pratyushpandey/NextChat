import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-dvh flex-col">
      <div className="border-b bg-card px-4 py-3">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="mt-2 h-3 w-28" />
      </div>
      <div className="flex-1 p-4">
        <div className="space-y-3">
          <div className="h-10 w-2/3 rounded-lg bg-muted" />
          <div className="ml-auto h-10 w-2/3 rounded-lg bg-muted" />
          <div className="h-10 w-1/2 rounded-lg bg-muted" />
        </div>
      </div>
      <div className="border-t bg-card px-4 py-3">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
