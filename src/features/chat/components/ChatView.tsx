"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageList } from "@/features/chat/components/MessageList";
import { MessageComposer } from "@/features/chat/components/MessageComposer";
import { TypingIndicator } from "@/features/chat/components/TypingIndicator";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/features/chat/components/Sidebar";
import { PanelLeft } from "lucide-react";
import { ChatSidebarDrawer } from "@/features/chat/components/ChatSidebarDrawer";
import { getInitials } from "@/features/chat/lib/initials";

export function ChatView({ conversationId }: { conversationId: string }) {
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();

  const cid = useMemo(() => {
    const raw = (conversationId ?? "").trim();
    return raw ? (raw as Id<"conversations">) : null;
  }, [conversationId]);

  const me = useQuery(api.users.me);

  const canQueryConversation =
    !!cid && !!me && isAuthenticated && !isConvexAuthLoading;

  const info = useQuery(
    api.conversations.get,
    canQueryConversation ? { conversationId: cid } : "skip",
  );
  const messages = useQuery(
    api.messages.list,
    canQueryConversation ? { conversationId: cid, limit: 60 } : "skip",
  );
  const onlineUserIds = useQuery(api.presence.onlineUserIds);
  const typing = useQuery(
    api.typing.listActive,
    canQueryConversation ? { conversationId: cid } : "skip",
  );

  const onlineSet = useMemo(
    () => new Set((onlineUserIds ?? []).map(String)),
    [onlineUserIds],
  );

  const markRead = useMutation(api.conversations.markRead);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!cid) return;
    if (!me) return;
    if (!isAuthenticated || isConvexAuthLoading) return;
    void markRead({ conversationId: cid });
  }, [cid, me, isAuthenticated, isConvexAuthLoading, markRead]);

  const title =
    info?.conversation.type === "group"
      ? info.conversation.name ?? "Group"
      : (() => {
          const other = info?.members.find(
            (m: Doc<"users">) => m._id !== me?._id,
          );
          return other?.name ?? "Chat";
        })();

  const otherUser =
    info?.conversation.type === "direct"
      ? info?.members.find((m: Doc<"users">) => m._id !== me?._id) ?? null
      : null;

  const subtitle =
    info?.conversation.type === "group"
      ? `${info.members.length} members`
      : (() => {
          const online = otherUser?._id
            ? onlineSet.has(String(otherUser._id))
            : false;
          return online ? "Online" : "Offline";
        })();

  const showPresenceDot = !!otherUser?._id;
  const isOtherOnline = otherUser?._id
    ? onlineSet.has(String(otherUser._id))
    : false;

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex items-center justify-between gap-3 border-b bg-card/80 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-card/70">
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="md:hidden">
            <Link href="/app">Back</Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex lg:hidden"
            aria-label="Open chats"
            onClick={() => setSidebarOpen(true)}
          >
            <PanelLeft className="size-4" />
          </Button>

          <div className="flex min-w-0 items-center gap-3">
            <div className="relative">
              <Avatar className="size-9">
                <AvatarImage src={otherUser?.imageUrl ?? undefined} />
                <AvatarFallback>{getInitials(title)}</AvatarFallback>
              </Avatar>
              {showPresenceDot ? (
                <span
                  className={
                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card " +
                    (isOtherOnline ? "bg-emerald-500" : "bg-muted")
                  }
                  aria-hidden="true"
                />
              ) : null}
            </div>

            <div className="min-w-0">
            {info === undefined ? (
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            ) : (
              <>
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {subtitle}
                </p>
              </>
            )}
            </div>
          </div>
        </div>
      </div>

      <ChatSidebarDrawer open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </ChatSidebarDrawer>

      <div className={cn("flex-1", "overflow-hidden")}>
        <MessageList
          meUserId={me?._id}
          messages={messages}
        />
      </div>

      <div className="border-t bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <TypingIndicator typing={typing ?? []} />
        {cid ? (
          <MessageComposer conversationId={cid} disabled={!me} />
        ) : (
          <div className="space-y-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-9 w-20" />
          </div>
        )}
      </div>
    </div>
  );
}
