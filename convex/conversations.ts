import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { ensureMe, getMe } from "./lib/users";

function directKeyFor(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(":");
}

export const getOrCreateDirect = mutation({
  args: { otherUserId: v.id("users") },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    if (me!._id === args.otherUserId) throw new Error("Cannot DM yourself");

    const key = directKeyFor(me!._id, args.otherUserId);

    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_directKey", (q) => q.eq("directKey", key))
      .unique();

    const now = Date.now();

    if (existing) {
      const membership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId_userId", (q) =>
          q.eq("conversationId", existing._id).eq("userId", me!._id),
        )
        .unique();
      if (!membership) {
        await ctx.db.insert("conversationMembers", {
          conversationId: existing._id,
          userId: me!._id,
          role: "member",
          joinedAt: now,
          unreadCount: 0,
        });
      }
      return { conversationId: existing._id };
    }

    const conversationId = await ctx.db.insert("conversations", {
      type: "direct",
      directKey: key,
      createdBy: me!._id,
      createdAt: now,
      lastMessageAt: undefined,
      lastMessageSnippet: undefined,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: me!._id,
      role: "member",
      joinedAt: now,
      unreadCount: 0,
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: args.otherUserId,
      role: "member",
      joinedAt: now,
      unreadCount: 0,
    });

    return { conversationId };
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    memberUserIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    const now = Date.now();

    const memberSet = new Set<Id<"users">>([me._id, ...args.memberUserIds]);

    const conversationId = await ctx.db.insert("conversations", {
      type: "group",
      name: args.name.trim(),
      createdBy: me!._id,
      createdAt: now,
      lastMessageAt: undefined,
      lastMessageSnippet: undefined,
    });

    for (const userId of memberSet) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
        role: userId === me!._id ? "admin" : "member",
        joinedAt: now,
        unreadCount: 0,
      });
    }

    return { conversationId };
  },
});

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const me = await getMe(ctx);
    if (!me) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", me._id))
      .collect();

    type ConversationListItem = {
      conversationId: Id<"conversations">;
      type: "direct" | "group";
      title: string;
      imageUrl?: string;
      memberCount: number;
      lastMessageAt: number | null;
      lastMessageSnippet: string;
      unreadCount: number;
      directOtherUserId: Id<"users"> | null;
    };

    const results: ConversationListItem[] = [];

    for (const m of memberships) {
      const conv = await ctx.db.get("conversations", m.conversationId);
      if (!conv) continue;

      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", conv._id))
        .collect();

      let title = conv.type === "group" ? conv.name ?? "Group" : "Direct";
      let imageUrl: string | undefined;
      let directOtherUser: Doc<"users"> | null = null;

      if (conv.type === "direct") {
        const other = members.find((x) => x.userId !== me._id);
        if (other) {
          directOtherUser = await ctx.db.get("users", other.userId);
          const candidate = directOtherUser?.name?.trim() ?? "";
          title = candidate && candidate.toLowerCase() !== "unknown"
            ? candidate
            : `User ${shortId(String(other.userId))}`;
          imageUrl = directOtherUser?.imageUrl;
        }
      }

      results.push({
        conversationId: conv._id,
        type: conv.type,
        title,
        imageUrl,
        memberCount: members.length,
        lastMessageAt: conv.lastMessageAt ?? null,
        lastMessageSnippet: conv.lastMessageSnippet ?? "",
        unreadCount: m.unreadCount,
        directOtherUserId: directOtherUser?._id ?? null,
      });
    }

    results.sort(
      (a, b) => (b.lastMessageAt ?? 0) - (a.lastMessageAt ?? 0),
    );

    return results;
  },
});

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function shortId(value: string): string {
  const base36 = fnv1a32(value).toString(36);
  return base36.padStart(6, "0").slice(0, 6).toUpperCase();
}

export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    if (!me) return null;
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();
    if (!membership) throw new Error("Forbidden");

    const conv = await ctx.db.get("conversations", args.conversationId);
    if (!conv) throw new Error("Not found");

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const users = await Promise.all(
      members.map((m) => ctx.db.get("users", m.userId)),
    );

    const presentUsers = users.filter((u): u is Doc<"users"> => u !== null);

    return {
      conversation: conv,
      members: presentUsers,
    };
  },
});

export const markRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();
    if (!membership) throw new Error("Forbidden");

    await ctx.db.patch(membership._id, {
      unreadCount: 0,
      lastReadAt: Date.now(),
    });

    return { ok: true };
  },
});
