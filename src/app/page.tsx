import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col justify-center px-6 py-16">
        <div className="space-y-4">
          <p className="text-sm font-medium text-muted-foreground">NextChat</p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            A WhatsApp × Slack-style realtime chat.
          </h1>
          <p className="max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            One-on-one and group conversations, presence, typing indicators,
            unread counts, reactions, and smooth modern animations.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <SignedOut>
            <Button asChild size="lg">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-up">Create account</Link>
            </Button>
          </SignedOut>
          <SignedIn>
            <Button asChild size="lg">
              <Link href="/app">Open app</Link>
            </Button>
          </SignedIn>
        </div>

        <div className="mt-14 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          <p>
            Tip: After you configure Clerk + Convex environment variables, this
            app is deploy-ready on Vercel.
          </p>
        </div>
      </div>
    </div>
  );
}
