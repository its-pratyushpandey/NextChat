"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal } from "lucide-react";
import { gsap } from "gsap";

export function MessageComposer({
  conversationId,
  disabled,
}: {
  conversationId: Id<"conversations">;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastFailed, setLastFailed] = useState<string | null>(null);

  const send = useMutation(api.messages.send);
  const pingTyping = useMutation(api.typing.ping);

  const canSend = body.trim().length > 0 && !sending && !disabled;

  useEffect(() => {
    const btn = document.querySelector('[data-gsap="send-button"]');
    if (!btn) return;
    const el = btn as HTMLElement;
    const onEnter = () => gsap.to(el, { scale: 1.02, duration: 0.12, ease: "power2.out" });
    const onLeave = () => gsap.to(el, { scale: 1, duration: 0.12, ease: "power2.out" });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const typingPing = useMemo(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return () => {
      if (timeout) globalThis.clearTimeout(timeout);
      void pingTyping({ conversationId });
      timeout = globalThis.setTimeout(() => {
        timeout = null;
      }, 450);
    };
  }, [conversationId, pingTyping]);

  async function onSend() {
    if (!canSend) return;

    const text = body;
    setBody("");
    setSending(true);
    setLastFailed(null);

    try {
      await send({ conversationId, body: text });

      const el = document.querySelector('[data-gsap="composer-send"]');
      if (el) {
        gsap.fromTo(
          el,
          { scale: 0.95 },
          { scale: 1, duration: 0.18, ease: "power2.out" },
        );
      }
    } catch {
      setBody(text);
      setLastFailed(text);
    } finally {
      setSending(false);
    }
  }

  async function onRetry() {
    if (!lastFailed || sending || disabled) return;
    setBody(lastFailed);
    setLastFailed(null);
    await onSend();
  }

  return (
    <div className="space-y-2">
      {lastFailed ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
          <span className="truncate">Failed to send. Check connection and retry.</span>
          <Button type="button" variant="secondary" size="sm" onClick={() => void onRetry()}>
            Retry
          </Button>
        </div>
      ) : null}

      <div
        className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm"
        data-gsap="composer-send"
      >
        <Textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            typingPing();
          }}
          placeholder="Message…"
          className="min-h-11 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
        />

        <Button
          onClick={onSend}
          disabled={!canSend}
          size="icon"
          className="shrink-0 rounded-2xl"
          data-gsap="send-button"
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SendHorizontal className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
