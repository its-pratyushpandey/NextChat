import { EmptyState } from "@/features/ui/EmptyState";

export default function Page() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <EmptyState
        title="No conversation selected"
        description="Pick a chat from the sidebar or start a new one from People."
        ctaLabel="Start a new chat"
        ctaHref="/app"
      />
    </div>
  );
}
