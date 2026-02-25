"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "gsap";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { EmptyState } from "@/features/ui/EmptyState";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { ArrowDown } from "lucide-react";

function isNearBottom(el: HTMLElement, thresholdPx = 140) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < thresholdPx;
}

export function MessageList({
  meUserId,
  messages,
}: {
  meUserId?: Id<"users">;
  messages:
    | undefined
    | Array<{
        _id: Id<"messages">;
        senderId: Id<"users">;
        body: string;
        type?: "text" | "file" | "voice";
        file?: {
          storageId: Id<"_storage">;
          fileName: string;
          fileSize: number;
          mimeType: string;
        };
        voice?: {
          storageId: Id<"_storage">;
          durationMs: number;
          mimeType: string;
        };
        fileUrl?: string | null;
        voiceUrl?: string | null;
        createdAt: number;
        deletedAt?: number;
        sender: Doc<"users"> | null;
        reactionCounts: Array<{
          emoji: Doc<"messageReactions">["emoji"];
          count: number;
        }>;
        myReactions: Array<Doc<"messageReactions">["emoji"]>;
      }>;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [showNewButton, setShowNewButton] = useState(false);
  const lastMessageId = useMemo(
    () => (messages && messages.length ? String(messages[messages.length - 1]._id) : null),
    [messages],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      setShowNewButton(!isNearBottom(el));
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    const raf = globalThis.requestAnimationFrame(() => onScroll());

    return () => {
      globalThis.cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!lastMessageId) return;

    if (isNearBottom(el)) {
      el.scrollTop = el.scrollHeight;
      el.dispatchEvent(new Event("scroll"));
    }
  }, [lastMessageId]);

  function scrollToBottom() {
    const el = scrollRef.current;
    if (!el) return;

    gsap.to(el, {
      scrollTop: el.scrollHeight,
      duration: 0.45,
      ease: "power2.out",
      onComplete: () => setShowNewButton(false),
    });
  }

  if (messages !== undefined && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          title="No messages yet"
          description="Start the conversation — say hi!"
        />
      </div>
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto bg-muted/10 px-3 py-4 sm:px-4"
      >
        {messages === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-2.5">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={String(m._id)}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                >
                  <MessageBubble message={m} isMe={meUserId === m.senderId} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewButton ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2"
          >
            <Button
              variant="secondary"
              className="rounded-full shadow-md"
              onClick={scrollToBottom}
            >
              <ArrowDown className="size-4" />
              New messages
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
