"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { formatChatTimestamp } from "@/lib/formatTimestamp";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CreateGroupDialog } from "@/features/groups/CreateGroupDialog";
import { EmptyState } from "@/features/ui/EmptyState";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { getInitials } from "@/features/chat/lib/initials";

const UserButtonNoSSR = dynamic(
  async () => {
    const mod = await import("@clerk/nextjs");
    return mod.UserButton;
  },
  {
    ssr: false,
    loading: () => <Skeleton className="size-8 rounded-full" />,
  },
);

export function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery(api.users.me);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const conversations = useQuery(api.conversations.listMine);
  const onlineUserIds = useQuery(api.presence.onlineUserIds);
  const onlineSet = useMemo(
    () => new Set((onlineUserIds ?? []).map(String)),
    [onlineUserIds],
  );

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const people = useQuery(api.users.listForDiscovery, {
    query: debouncedSearch.trim() ? debouncedSearch : undefined,
    limit: 50,
  });

  const getOrCreateDirect = useMutation(api.conversations.getOrCreateDirect);

  const activeConversationId = useMemo(() => {
    const match = pathname?.match(/^\/app\/c\/([^/?#]+)/);
    return match?.[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    const btn = document.querySelector('[data-gsap="clear-search"]');
    if (!btn) return;
    const el = btn as HTMLElement;
    const onEnter = () => gsap.to(el, { scale: 1.01, duration: 0.12, ease: "power2.out" });
    const onLeave = () => gsap.to(el, { scale: 1, duration: 0.12, ease: "power2.out" });
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  async function startDirect(otherUserId: Id<"users">) {
    const result = await getOrCreateDirect({ otherUserId });
    router.push(`/app/c/${result.conversationId}`);
    onNavigate?.();
  }

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3">
        <Link href="/app" className="text-sm font-semibold tracking-tight">
          NextChat
        </Link>
        <div className="flex items-center gap-2">
          <CreateGroupDialog />
          <UserButtonNoSSR
            appearance={{ elements: { avatarBox: "size-8" } }}
            showName={false}
          />
        </div>
      </div>

      <div className="space-y-2 px-4 py-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            ref={searchInputRef}
            className="h-10 pl-9 pr-9"
          />
          {search.trim() ? (
            <button
              type="button"
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setSearch("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {me ? `Signed in as ${me.name}` : "Loading profile…"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chats
            </h3>
          </div>

          {conversations === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="rounded-lg border bg-background p-4">
              <EmptyState
                title="No conversations yet"
                description="Search for a teammate and start chatting."
                ctaLabel="Find people"
                ctaOnClick={() => searchInputRef.current?.focus()}
              />
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((c) => (
                <button
                  key={String(c.conversationId)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden",
                    activeConversationId === String(c.conversationId)
                      ? "bg-sidebar-accent"
                      : "bg-transparent",
                  )}
                  onClick={() => {
                    router.push(`/app/c/${c.conversationId}`);
                    onNavigate?.();
                  }}
                  aria-current={
                    activeConversationId === String(c.conversationId)
                      ? "page"
                      : undefined
                  }
                >
                  <div className="relative">
                    <Avatar className="size-10">
                      <AvatarImage src={c.imageUrl ?? undefined} />
                      <AvatarFallback>{getInitials(c.title)}</AvatarFallback>
                    </Avatar>
                    {c.type === "direct" && c.directOtherUserId ? (
                      <span
                        className={
                          "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar " +
                          (onlineSet.has(String(c.directOtherUserId))
                            ? "bg-emerald-500"
                            : "bg-muted")
                        }
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      {c.lastMessageAt ? (
                        <p
                          className="shrink-0 text-xs text-muted-foreground"
                          suppressHydrationWarning
                        >
                          {formatChatTimestamp(c.lastMessageAt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs text-muted-foreground">
                        {c.lastMessageSnippet ||
                          (c.type === "group"
                            ? `${c.memberCount} members`
                            : "No messages yet")}
                      </p>
                      {c.unreadCount > 0 ? (
                        <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">
                          {c.unreadCount}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          <h3 className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            People
          </h3>

          {people === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : people.length === 0 ? (
            <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            <div className="space-y-1">
              {people.map((u) => (
                <button
                  key={String(u._id)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden"
                  onClick={() => startDirect(u._id)}
                >
                  <div className="relative">
                    <Avatar className="size-9">
                      <AvatarImage src={u.imageUrl ?? undefined} />
                      <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={
                        "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-sidebar " +
                        (onlineSet.has(String(u._id))
                          ? "bg-emerald-500"
                          : "bg-muted")
                      }
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {onlineSet.has(String(u._id)) ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              data-gsap="clear-search"
              onClick={() => setSearch("")}
            >
              Clear search
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
