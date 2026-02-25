import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { AuthSync } from "@/features/auth/AuthSync";
import { PresenceHeartbeat } from "@/features/auth/PresenceHeartbeat";
import { AppShell } from "@/features/chat/components/AppShell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SignedIn>
        <AuthSync />
        <PresenceHeartbeat />
        <AppShell>{children}</AppShell>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
