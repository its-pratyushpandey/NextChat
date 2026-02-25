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
import { Separator } from "@/components/ui/separator";
import { formatChatTimestamp } from "@/lib/formatTimestamp";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CreateGroupDialog } from "@/features/groups/CreateGroupDialog";
import { EmptyState } from "@/features/ui/EmptyState";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import { BellOff, Pin, Search, SlidersHorizontal, X } from "lucide-react";
import { getUserDisplayName } from "@/lib/userPresentation";
import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [chatFilter, setChatFilter] = useState<
    "all" | "unread" | "pinned" | "groups"
  >("all");

  function loadBoolMap(key: string): Record<string, boolean> {
    if (typeof window === "undefined") return {};
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return {};
      const ids = JSON.parse(raw) as unknown;
      if (!Array.isArray(ids)) return {};

      const map: Record<string, boolean> = {};
      for (const id of ids) {
        if (typeof id === "string" && id.trim()) map[id] = true;
      }
      return map;
    } catch {
      return {};
    }
  }

  const [pinnedChats, setPinnedChats] = useState<Record<string, boolean>>(() =>
    loadBoolMap("nextchat:pinnedChats"),
  );
  const [mutedChats, setMutedChats] = useState<Record<string, boolean>>(() =>
    loadBoolMap("nextchat:mutedChats"),
  );

  useEffect(() => {
    function persist(map: Record<string, boolean>, key: string) {
      const ids = Object.keys(map).filter((k) => map[k]);
      window.localStorage.setItem(key, JSON.stringify(ids));
    }

    try {
      persist(pinnedChats, "nextchat:pinnedChats");
      persist(mutedChats, "nextchat:mutedChats");
    } catch {
      // Ignore write failures (private mode, etc).
    }
  }, [pinnedChats, mutedChats]);
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

  const filteredConversations = useMemo(() => {
    const all = conversations ?? [];
    const q = search.trim().toLowerCase();

    let next = all;
    if (q) {
      next = next.filter((c) => {
        const haystack = `${c.title} ${c.lastMessageSnippet}`.toLowerCase();
        return haystack.includes(q);
      });
    }

    if (chatFilter === "unread") {
      next = next.filter((c) => c.unreadCount > 0);
    } else if (chatFilter === "pinned") {
      next = next.filter((c) => pinnedChats[String(c.conversationId)]);
    } else if (chatFilter === "groups") {
      next = next.filter((c) => c.type === "group");
    }

    next = [...next].sort((a, b) => {
      const aPinned = pinnedChats[String(a.conversationId)] ? 1 : 0;
      const bPinned = pinnedChats[String(b.conversationId)] ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;
      return (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0);
    });

    return next;
  }, [conversations, search, chatFilter, pinnedChats]);

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

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === "Escape") {
        if (document.activeElement === searchInputRef.current) {
          setSearch("");
          searchInputRef.current?.blur();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function togglePinned(conversationId: string) {
    setPinnedChats((prev) => ({
      ...prev,
      [conversationId]: !prev[conversationId],
    }));
  }

  function toggleMuted(conversationId: string) {
    setMutedChats((prev) => ({
      ...prev,
      [conversationId]: !prev[conversationId],
    }));
  }

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
            placeholder="Search chats & people…"
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
          {me
            ? `Signed in as ${getUserDisplayName({
                id: String(me._id),
                username: me.name,
                email: me.email ?? null,
              })}`
            : "Loading profile…"}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <h3 className="py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Chats
            </h3>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant={chatFilter === "all" ? "secondary" : "ghost"}
                className="h-7 rounded-xl px-2"
                onClick={() => setChatFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chatFilter === "unread" ? "secondary" : "ghost"}
                className="h-7 rounded-xl px-2"
                onClick={() => setChatFilter("unread")}
              >
                Unread
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chatFilter === "pinned" ? "secondary" : "ghost"}
                className="h-7 rounded-xl px-2"
                onClick={() => setChatFilter("pinned")}
              >
                Pinned
              </Button>
              <Button
                type="button"
                size="sm"
                variant={chatFilter === "groups" ? "secondary" : "ghost"}
                className="h-7 rounded-xl px-2"
                onClick={() => setChatFilter("groups")}
              >
                Groups
              </Button>
            </div>
          </div>

          {conversations === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="rounded-lg border bg-background p-4">
              <EmptyState
                title="No conversations yet"
                description={
                  search.trim()
                    ? "No chats match your search."
                    : "Search for a teammate and start chatting."
                }
                ctaLabel="Find people"
                ctaOnClick={() => searchInputRef.current?.focus()}
              />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((c) => {
                const conversationId = String(c.conversationId);
                const avatarId = c.directOtherUserId
                  ? String(c.directOtherUserId)
                  : conversationId;
                const isPinned = !!pinnedChats[conversationId];
                const isMuted = !!mutedChats[conversationId];
                const isActive = activeConversationId === conversationId;
                const directOnline =
                  c.type === "direct" && c.directOtherUserId
                    ? onlineSet.has(String(c.directOtherUserId))
                    : undefined;
                return (
                  <div
                    key={conversationId}
                    className={cn(
                      "group flex w-full items-center gap-2 rounded-2xl px-2 py-2 transition-colors hover:bg-sidebar-accent",
                      isActive ? "bg-sidebar-accent" : "bg-transparent",
                    )}
                  >
                    <button
                      type="button"
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-0.5 text-left",
                        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden",
                      )}
                      onClick={() => {
                        router.push(`/app/c/${c.conversationId}`);
                        onNavigate?.();
                      }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <div className="relative">
                        <UserAvatar
                          userId={avatarId}
                          name={c.title}
                          imageUrl={c.imageUrl ?? null}
                          size={32}
                          isOnline={directOnline}
                          statusBorderClassName="border-sidebar"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {c.title}
                            </p>
                            {isPinned ? (
                              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : null}
                            {isMuted ? (
                              <BellOff className="size-3.5 shrink-0 text-muted-foreground" />
                            ) : null}
                          </div>
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className={cn(
                            "h-9 w-9 rounded-xl text-muted-foreground",
                            "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
                          )}
                          aria-label="Chat options"
                        >
                          <SlidersHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => togglePinned(conversationId)}
                        >
                          {isPinned ? "Unpin" : "Pin"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleMuted(conversationId)}>
                          {isMuted ? "Unmute" : "Mute"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>
                          Clear chat (UI only)
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          Delete chat (UI only)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
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
                (() => {
                  const displayName = getUserDisplayName({
                    id: String(u._id),
                    username: u.name,
                    email: u.email ?? null,
                  });
                  const avatarId = String(u._id);
                  return (
                <button
                  key={String(u._id)}
                  className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-sidebar-accent focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-hidden"
                  onClick={() => startDirect(u._id)}
                >
                  <div className="relative">
                    <UserAvatar
                      userId={avatarId}
                      name={displayName}
                      imageUrl={u.imageUrl ?? null}
                      size={32}
                      isOnline={onlineSet.has(String(u._id))}
                      statusBorderClassName="border-sidebar"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {onlineSet.has(String(u._id)) ? "Online" : "Offline"}
                    </p>
                  </div>
                </button>
                  );
                })()
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
