import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getMe, getMeForAnyCtx } from "./lib/users";

const TYPING_WINDOW_MS = 2_000;

export const ping = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getMeForAnyCtx(ctx);
    if (!me) return { ok: false };
    const now = Date.now();

    const existing = await ctx.db
      .query("typingStates")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", me._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return { ok: true };
    }

    await ctx.db.insert("typingStates", {
      conversationId: args.conversationId,
      userId: me._id,
      updatedAt: now,
    });

    return { ok: true };
  },
});

export const listActive = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    if (!me) return [];

    const now = Date.now();
    const rows = await ctx.db
      .query("typingStates")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    const active = rows.filter((r) => now - r.updatedAt <= TYPING_WINDOW_MS);
    const others = active.filter((r) => r.userId !== me._id);

    const users = await Promise.all(
      others.map((r) => ctx.db.get("users", r.userId)),
    );

    const present = users.filter((u): u is Doc<"users"> => u !== null);
    return present.map((u) => ({ userId: u._id, name: u.name }));
  },
});
