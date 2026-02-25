import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getMeForAnyCtx } from "./lib/users";

const ONLINE_WINDOW_MS = 15_000;

export const heartbeat = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const me = await getMeForAnyCtx(ctx);
    if (!me) return { ok: false };
    const now = Date.now();

    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_userId_sessionId", (q) =>
        q.eq("userId", me._id).eq("sessionId", args.sessionId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return { ok: true };
    }

    await ctx.db.insert("presenceSessions", {
      userId: me._id,
      sessionId: args.sessionId,
      updatedAt: now,
      createdAt: now,
    });

    return { ok: true };
  },
});

export const endSession = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const me = await getMeForAnyCtx(ctx);
    if (!me) return { ok: false };

    const existing = await ctx.db
      .query("presenceSessions")
      .withIndex("by_userId_sessionId", (q) =>
        q.eq("userId", me._id).eq("sessionId", args.sessionId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return { ok: true };
  },
});

export const onlineUserIds = query({
  args: {},
  handler: async (ctx) => {
    // Presence is safe to treat as public; avoid throwing during auth loading.
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const now = Date.now();
    const sessions = await ctx.db.query("presenceSessions").collect();
    const online = sessions.filter((s) => now - s.updatedAt <= ONLINE_WINDOW_MS);
    return Array.from(new Set(online.map((s) => s.userId)));
  },
});
