import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { ensureMe, getMe } from "./lib/users";

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

      enriched.push({
        _id: m._id,
        _creationTime: m._creationTime,
        conversationId: m.conversationId,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt,
        deletedAt: m.deletedAt,
        sender: senderMap.get(m.senderId) ?? null,
        reactionCounts,
        myReactions: Array.from(myReactions),
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

    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();
    if (!membership) throw new Error("Forbidden");

    const now = Date.now();
    const body = args.body.trim();
    if (!body) throw new Error("Empty message");

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: me._id,
      body,
      createdAt: now,
    });

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessageSnippet: body.slice(0, 120),
    });

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const m of members) {
      if (m.userId === me._id) continue;
      await ctx.db.patch(m._id, { unreadCount: (m.unreadCount ?? 0) + 1 });
    }

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
