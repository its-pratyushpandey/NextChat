"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth as useClerkAuth } from "@clerk/nextjs";
import type { GetTokenOptions } from "@clerk/types";
import { MotionConfig } from "framer-motion";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkJwtTemplate = process.env.NEXT_PUBLIC_CLERK_JWT_TEMPLATE;

let hasWarnedTokenFailure = false;

if (!convexUrl) {
  console.warn(
    "Missing NEXT_PUBLIC_CONVEX_URL. Run `npx convex dev` to generate .env.local.",
  );
}

const convex = new ConvexReactClient(convexUrl ?? "");

function useAuthForConvex() {
  const auth = useClerkAuth();

  return {
    ...auth,
    // convex/react-clerk passes { template: "convex" } by default.
    // If you haven't created that Clerk JWT Template, Clerk returns 404.
    // We intentionally ignore the incoming template unless you explicitly
    // configure NEXT_PUBLIC_CLERK_JWT_TEMPLATE.
    getToken: async (options?: GetTokenOptions) => {
      try {
        const rest = { ...(options ?? {}) } as GetTokenOptions;
        // Avoid Clerk 404s when a JWT template isn't configured.
        delete (rest as GetTokenOptions & { template?: string }).template;

        if (clerkJwtTemplate && clerkJwtTemplate.trim().length > 0) {
          return await auth.getToken({
            ...rest,
            template: clerkJwtTemplate,
          });
        }

        // No template configured: mint the default Clerk token.
        return await auth.getToken(rest);
      } catch (err) {
        // Treat as unauthenticated. Warn once to keep the console clean.
        if (!hasWarnedTokenFailure) {
          hasWarnedTokenFailure = true;
          console.warn(
            "Failed to fetch Clerk token for Convex. " +
              "If you're using JWT templates, set NEXT_PUBLIC_CLERK_JWT_TEMPLATE to the template name. " +
              "Otherwise this warning can be ignored while signed out.",
            err,
          );
        }
        return null;
      }
    },
  };
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuthForConvex}>
      <TooltipProvider delayDuration={150}>
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </TooltipProvider>
    </ConvexProviderWithClerk>
  );
}
