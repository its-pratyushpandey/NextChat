import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ensureMe } from "./lib/users";

export const toggle = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.union(
      v.literal("👍"),
      v.literal("❤️"),
      v.literal("😂"),
      v.literal("😮"),
      v.literal("😢"),
    ),
  },
  handler: async (ctx, args) => {
    const me = await ensureMe(ctx);

    const existing = await ctx.db
      .query("messageReactions")
      .withIndex("by_messageId_userId_emoji", (q) =>
        q.eq("messageId", args.messageId)
          .eq("userId", me._id)
          .eq("emoji", args.emoji),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { toggled: "off" as const };
    }

    await ctx.db.insert("messageReactions", {
      messageId: args.messageId,
      userId: me._id,
      emoji: args.emoji,
      createdAt: Date.now(),
    });

    return { toggled: "on" as const };
  },
});
