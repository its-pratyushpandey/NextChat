"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Mic, Paperclip, Smile, SendHorizontal } from "lucide-react";
import { gsap } from "gsap";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COMPOSER_EMOJIS = [
  "😀",
  "😁",
  "😄",
  "😅",
  "😂",
  "🥲",
  "😊",
  "😍",
  "😘",
  "😎",
  "🤔",
  "😴",
  "🙌",
  "👍",
  "🙏",
  "🎉",
  "🔥",
  "⚡",
  "❤️",
  "✨",
] as const;

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
  const charCount = body.length;

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
        <div className="flex flex-col items-center gap-1 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 rounded-2xl"
                disabled={disabled}
                aria-label="Open emoji picker"
              >
                <Smile className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="grid grid-cols-10 gap-1 p-1">
                {COMPOSER_EMOJIS.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    className="h-8 w-8 justify-center rounded-md p-0"
                    onClick={() => {
                      setBody((prev) => (prev ? `${prev} ${emoji}` : emoji));
                      typingPing();
                    }}
                  >
                    <span className="text-base leading-none">{emoji}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-2xl"
            disabled
            aria-label="Attach (UI only)"
          >
            <Paperclip className="size-4" />
          </Button>
        </div>

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
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void onSend();
              return;
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
        />

        <div className="flex flex-col items-center gap-1 pb-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-2xl"
            disabled
            aria-label="Voice message (UI only)"
          >
            <Mic className="size-4" />
          </Button>

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

      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>Enter to send • Shift+Enter newline</span>
        <span suppressHydrationWarning>{charCount}</span>
      </div>
    </div>
  );
}
