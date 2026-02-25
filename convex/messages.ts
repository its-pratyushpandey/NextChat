import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ensureMe, getMe } from "./lib/users";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function isAllowedGeneralMimeType(mimeType: string): boolean {
  const t = mimeType.toLowerCase();
  if (t.startsWith("image/")) return true;
  if (t.startsWith("video/")) return true;
  if (t.startsWith("audio/")) return true;

  // Documents / common safe types.
  if (t === "application/pdf") return true;
  if (t === "text/plain") return true;
  if (t === "application/msword") return true;
  if (t === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return true;
  if (t === "application/vnd.ms-powerpoint") return true;
  if (t === "application/vnd.openxmlformats-officedocument.presentationml.presentation") return true;
  if (t === "application/vnd.ms-excel") return true;
  if (t === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return true;

  return false;
}

function isAllowedVoiceMimeType(mimeType: string): boolean {
  const t = mimeType.toLowerCase();
  // MediaRecorder commonly produces audio/webm (opus) or audio/ogg.
  if (t.startsWith("audio/")) return true;
  return false;
}

async function ensureConversationMember(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId_userId", (q) =>
      q.eq("conversationId", conversationId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new Error("Forbidden");
  return membership;
}

async function bumpUnreadCounts(
  ctx: MutationCtx,
  conversationId: Id<"conversations">,
  senderId: Id<"users">,
) {
  const members = await ctx.db
    .query("conversationMembers")
    .withIndex("by_conversationId", (q) => q.eq("conversationId", conversationId))
    .collect();

  for (const m of members) {
    if (m.userId === senderId) continue;
    await ctx.db.patch(m._id, { unreadCount: (m.unreadCount ?? 0) + 1 });
  }
}

export const list = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    if (!me) return [];

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();
    if (!membership) throw new Error("Forbidden");

    const limit = Math.min(args.limit ?? 50, 200);

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("desc")
      .take(limit);

    const asc = [...messages].reverse();

    const senderIds: Id<"users">[] = Array.from(
      new Set(asc.map((m: Doc<"messages">) => m.senderId)),
    );
    const senders = await Promise.all(
      senderIds.map((id) => ctx.db.get("users", id)),
    );
    const senderMap = new Map(senderIds.map((id, i) => [id, senders[i]]));

    type MessageWithExtras = Doc<"messages"> & {
      sender: Doc<"users"> | null;
      reactionCounts: Array<{
        emoji: Doc<"messageReactions">["emoji"];
        count: number;
      }>;
      myReactions: Array<Doc<"messageReactions">["emoji"]>;
      fileUrl?: string | null;
      voiceUrl?: string | null;
    };

    const enriched: MessageWithExtras[] = [];
    for (const m of asc) {
      const reactions = await ctx.db
        .query("messageReactions")
        .withIndex("by_messageId", (q) => q.eq("messageId", m._id))
        .collect();

      const reactionCountsMap = new Map<
        Doc<"messageReactions">["emoji"],
        number
      >();
      const myReactions = new Set<Doc<"messageReactions">["emoji"]>();
      for (const r of reactions) {
        reactionCountsMap.set(r.emoji, (reactionCountsMap.get(r.emoji) ?? 0) + 1);
        if (r.userId === me._id) myReactions.add(r.emoji);
      }

      const reactionCounts = Array.from(reactionCountsMap.entries())
        .map(([emoji, count]) => ({ emoji, count }))
        .sort((a, b) => b.count - a.count || a.emoji.localeCompare(b.emoji));

      const fileUrl = m.deletedAt || !m.file ? null : await ctx.storage.getUrl(m.file.storageId);
      const voiceUrl = m.deletedAt || !m.voice ? null : await ctx.storage.getUrl(m.voice.storageId);

      enriched.push({
        _id: m._id,
        _creationTime: m._creationTime,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        type: m.type,
        file: m.file,
        voice: m.voice,
        createdAt: m.createdAt,
        deletedAt: m.deletedAt,
        sender: senderMap.get(m.senderId) ?? null,
        reactionCounts,
        myReactions: Array.from(myReactions),
        fileUrl,
        voiceUrl,
      });
    }

    return enriched;
  },
});

export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);

    await ensureConversationMember(ctx, args.conversationId, me._id);

    const now = Date.now();
    const body = args.body.trim();
    if (!body) throw new Error("Empty message");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      body,
      type: "text",
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessageSnippet: body.slice(0, 120),
    });

    await bumpUnreadCounts(ctx, args.conversationId, me._id);

    return { messageId };
  },
});

export const generateUploadUrl = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    await ensureConversationMember(ctx, args.conversationId, me._id);
    return await ctx.storage.generateUploadUrl();
  },
});

export const sendFile = mutation({
  args: {
    conversationId: v.id("conversations"),
    file: v.object({
      storageId: v.id("_storage"),
      fileName: v.string(),
      fileSize: v.number(),
      mimeType: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    await ensureConversationMember(ctx, args.conversationId, me._id);

    if (args.file.fileSize <= 0 || args.file.fileSize > MAX_UPLOAD_BYTES) {
      throw new Error("File too large");
    }
    if (!isAllowedGeneralMimeType(args.file.mimeType)) {
      throw new Error("Unsupported file type");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      body: "",
      type: "file",
      file: args.file,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessageSnippet: `📎 ${args.file.fileName}`.slice(0, 120),
    });

    await bumpUnreadCounts(ctx, args.conversationId, me._id);
    return { messageId };
  },
});

export const sendVoice = mutation({
  args: {
    conversationId: v.id("conversations"),
    voice: v.object({
      storageId: v.id("_storage"),
      durationMs: v.number(),
      mimeType: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    await ensureConversationMember(ctx, args.conversationId, me._id);

    if (args.voice.durationMs <= 0 || args.voice.durationMs > 10 * 60 * 1000) {
      throw new Error("Invalid duration");
    }
    if (!isAllowedVoiceMimeType(args.voice.mimeType)) {
      throw new Error("Unsupported audio type");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      body: "",
      type: "voice",
      voice: args.voice,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessageSnippet: "🎤 Voice message",
    });

    await bumpUnreadCounts(ctx, args.conversationId, me._id);
    return { messageId };
  },
});

export const softDelete = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    const msg = await ctx.db.get("messages", args.messageId);
    if (!msg) throw new Error("Not found");
    if (msg.senderId !== me._id) throw new Error("Forbidden");

    if (msg.deletedAt) return { ok: true };

    const now = Date.now();
    await ctx.db.patch(args.messageId, {
      body: "",
      type: msg.type,
      file: msg.file,
      voice: msg.voice,
      deletedAt: now,
    });

    const conv = await ctx.db.get("conversations", msg.conversationId);
    if (conv?.lastMessageAt === msg.createdAt) {
      await ctx.db.patch(msg.conversationId, {
        lastMessageSnippet: "This message was deleted",
      });
    }

    return { ok: true };
  },
});
