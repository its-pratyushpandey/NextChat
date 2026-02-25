"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function AuthSync() {
  const { isLoaded, isSignedIn } = useUser();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const syncMe = useMutation(api.users.syncMe);
  const didRun = useRef(false);
  const inFlight = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (isConvexAuthLoading || !isAuthenticated) return;
    if (didRun.current) return;
    if (inFlight.current) return;

    inFlight.current = true;
    let cancelled = false;

    void (async () => {
      try {
        const res = await syncMe({});
        if (cancelled) return;
        if (res?.ok) {
          didRun.current = true;
        }
      } catch {
        // Can fail during auth transitions; we'll retry once Convex is authed.
      } finally {
        if (!cancelled) inFlight.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, isAuthenticated, isConvexAuthLoading, syncMe]);

  return null;
}
