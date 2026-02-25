"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

function getOrCreateSessionId() {
  const key = "nextchat_session_id";
  try {
    const storage = globalThis.sessionStorage;
    const existing = storage?.getItem(key);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    storage?.setItem(key, created);
    return created;
  } catch {
    // Fallback (e.g. storage disabled). Still better than crashing.
    return globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  }
}

export function PresenceHeartbeat() {
  const sessionId = useMemo(() => getOrCreateSessionId(), []);
  const heartbeat = useMutation(api.presence.heartbeat);
  const endSession = useMutation(api.presence.endSession);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        await heartbeat({ sessionId });
      } catch {
        // ignore transient errors
      } finally {
        inFlight.current = false;
      }
    }

    void beat();
    const interval = globalThis.setInterval(() => {
      if (cancelled) return;
      void beat();
    }, 10_000);

    const onBeforeUnload = () => {
      // best-effort
      void endSession({ sessionId });
    };

    globalThis.addEventListener?.("beforeunload", onBeforeUnload);

    return () => {
      cancelled = true;
      globalThis.clearInterval(interval);
      globalThis.removeEventListener?.("beforeunload", onBeforeUnload);
      void endSession({ sessionId });
    };
  }, [endSession, heartbeat, sessionId]);

  return null;
}
