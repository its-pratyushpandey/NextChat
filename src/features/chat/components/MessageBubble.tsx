"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { formatChatTimestamp } from "@/lib/formatTimestamp";
import { Button } from "@/components/ui/button";
import { Download, File as FileIcon, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { gsap } from "gsap";
import { getUserDisplayName } from "@/lib/userPresentation";
import { UserAvatar } from "@/components/UserAvatar";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;
type Emoji = (typeof EMOJIS)[number];

function isEmoji(value: string): value is Emoji {
  return (EMOJIS as readonly string[]).includes(value);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** idx;
  const rounded = value >= 10 || idx === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[idx]}`;
}

function formatDurationMs(durationMs: number): string {
  const total = Math.max(0, Math.floor(durationMs / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export function MessageBubble({
  message,
  isMe,
}: {
  message: {
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
    reactionCounts: Array<{ emoji: string; count: number }>;
    myReactions: string[];
  };
  isMe: boolean;
}) {
  const softDelete = useMutation(api.messages.softDelete);
  const toggleReaction = useMutation(api.reactions.toggle);

  const [showReactions, setShowReactions] = useState(false);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  const kind = message.type ?? "text";
  const isDeleted = !!message.deletedAt;

  const displayBody = isDeleted ? "This message was deleted" : message.body;

  const timestamp = useMemo(
    () => formatChatTimestamp(message.createdAt),
    [message.createdAt],
  );

  async function onCopy() {
    if (isDeleted) return;
    if (kind !== "text") return;
    const text = message.body;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Best-effort fallback.
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand("copy");
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  async function onDelete() {
    await softDelete({ messageId: message._id });
  }

  async function onToggleReaction(emoji: Emoji, el?: HTMLElement | null) {
    await toggleReaction({ messageId: message._id, emoji });

    if (el) {
      gsap.fromTo(
        el,
        { scale: 0.9 },
        { scale: 1, duration: 0.18, ease: "back.out(2)" },
      );
    }

    if (bubbleRef.current) {
      gsap.fromTo(
        bubbleRef.current,
        { scale: 0.99 },
        { scale: 1, duration: 0.16, ease: "power2.out" },
      );
    }
  }

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div className="max-w-[90%] md:max-w-[72%]">
        <div
          ref={bubbleRef}
          className={cn(
            "group rounded-2xl border px-3.5 py-2.5 text-sm shadow-sm",
            isMe
              ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground"
              : "bg-card text-foreground",
          )}
        >
          {!isMe ? (
            <div className="mb-1 flex items-center gap-2">
              <UserAvatar
                userId={String(message.senderId)}
                name={getUserDisplayName({
                  id: String(message.senderId),
                  username: message.sender?.name ?? null,
                  email: message.sender?.email ?? null,
                })}
                imageUrl={message.sender?.imageUrl ?? null}
                size={28}
                statusBorderClassName="border-card"
              />
              <p className="min-w-0 truncate text-[11px] font-medium text-muted-foreground">
                {getUserDisplayName({
                  id: String(message.senderId),
                  username: message.sender?.name ?? null,
                  email: message.sender?.email ?? null,
                })}
              </p>
            </div>
          ) : null}

          {kind === "text" || isDeleted ? (
            <p
              className={cn(
                "whitespace-pre-wrap wrap-break-word",
                isDeleted &&
                  (isMe
                    ? "italic text-primary-foreground/75"
                    : "italic text-muted-foreground"),
              )}
            >
              {displayBody}
            </p>
          ) : kind === "file" ? (
            <div className="space-y-2">
              {!message.file ? (
                <p className={cn("text-sm", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  File unavailable
                </p>
              ) : message.file.mimeType.startsWith("image/") && message.fileUrl ? (
                <div className="overflow-hidden rounded-xl border bg-background/5">
                  {/* Intentionally using <img> to avoid Next Image domain config */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={message.fileUrl}
                    alt={message.file.fileName}
                    className="max-h-72 w-full object-contain"
                    loading="lazy"
                  />
                </div>
              ) : message.file.mimeType.startsWith("video/") && message.fileUrl ? (
                <video
                  className="w-full max-w-full rounded-xl border"
                  controls
                  preload="metadata"
                  src={message.fileUrl}
                />
              ) : message.file.mimeType.startsWith("audio/") && message.fileUrl ? (
                <div className="rounded-xl border bg-background/5 p-2">
                  <audio className="w-full" controls preload="metadata" src={message.fileUrl} />
                </div>
              ) : (
                <div className={cn("rounded-xl border p-3", isMe ? "bg-primary-foreground/10" : "bg-background")}> 
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border",
                        isMe ? "border-primary-foreground/20" : "bg-muted/20",
                      )}
                    >
                      <FileIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {message.file.fileName}
                      </p>
                      <p className={cn("text-xs", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatBytes(message.file.fileSize)} • {message.file.mimeType}
                      </p>
                    </div>
                    {message.fileUrl ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={isMe ? "secondary" : "outline"}
                        className="shrink-0"
                        asChild
                      >
                        <a href={message.fileUrl} target="_blank" rel="noreferrer">
                          <Download className="size-4" />
                          Download
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {!message.voice || !message.voiceUrl ? (
                <p className={cn("text-sm", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  Voice message unavailable
                </p>
              ) : (
                <div className={cn("rounded-xl border p-2", isMe ? "bg-primary-foreground/10" : "bg-background")}>
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg border", isMe ? "border-primary-foreground/20" : "bg-muted/20")}>
                      <Play className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <audio className="w-full" controls preload="metadata" src={message.voiceUrl} />
                      <p className={cn("mt-1 text-[11px]", isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {formatDurationMs(message.voice.durationMs)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-1 flex items-end justify-between gap-3">
            <p
              className={cn(
                "text-[10px]",
                isMe ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
              suppressHydrationWarning
            >
              {timestamp}
            </p>

            <div
              className={cn(
                "flex items-center gap-1 transition-opacity",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100",
              )}
            >
              <Button
                type="button"
                size="icon"
                variant={isMe ? "secondary" : "ghost"}
                className={cn(
                  "h-7 w-7 rounded-xl",
                  isMe &&
                    "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15",
                )}
                onClick={() => setShowReactions((v) => !v)}
                aria-label={showReactions ? "Hide reactions" : "Add a reaction"}
              >
                😊
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant={isMe ? "secondary" : "ghost"}
                    className={cn(
                      "h-7 w-7 rounded-xl",
                      isMe &&
                        "bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15",
                    )}
                    aria-label="Message actions"
                  >
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={isDeleted || kind !== "text"}
                    onClick={onCopy}
                  >
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>Forward (UI only)</DropdownMenuItem>
                  {isMe ? (
                    <DropdownMenuItem
                      disabled={!!message.deletedAt}
                      onClick={onDelete}
                    >
                      Delete
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showReactions ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {EMOJIS.map((emoji) => {
                const isOn = message.myReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    className={cn(
                      "rounded-full border px-2 py-1 text-xs shadow-sm transition-colors",
                      isOn
                        ? "bg-background/20"
                        : "bg-background/10 hover:bg-background/20",
                    )}
                    onClick={(e) =>
                      void onToggleReaction(emoji, e.currentTarget)
                    }
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          ) : null}

          {message.reactionCounts.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.reactionCounts
                .filter((r): r is { emoji: Emoji; count: number } =>
                  isEmoji(r.emoji),
                )
                .map(({ emoji, count }) => (
                  <span
                    key={emoji}
                    className={cn(
                      "cursor-pointer rounded-full border px-2 py-0.5 text-[11px] shadow-sm transition-transform",
                      isMe
                        ? "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground"
                        : "bg-muted/40",
                    )}
                    onClick={(e) =>
                      void onToggleReaction(emoji, e.currentTarget)
                    }
                    role="button"
                  >
                    {emoji} {count}
                  </span>
                ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
