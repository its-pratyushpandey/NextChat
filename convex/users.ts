import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getMe, ensureMe } from "./lib/users";

export const me = query({
  args: {},
  handler: async (ctx) => {
    return await getMe(ctx);
  },
});

export const syncMe = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { ok: false as const };
    }
    const user = await ensureMe(ctx);
    return { ok: true as const, userId: user._id };
  },
});

export const listForDiscovery = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await getMe(ctx);
    if (!me) return [];
    const q = (args.query ?? "").trim().toLowerCase();
    const limit = Math.min(args.limit ?? 50, 100);

    const all = await ctx.db.query("users").collect();
    const otherUsers = all.filter((u: Doc<"users">) => u._id !== me._id);

    if (!q) {
      return otherUsers
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, limit);
    }

    return otherUsers
      .filter((u) => u.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit);
  },
});
