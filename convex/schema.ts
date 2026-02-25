import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),

  conversations: defineTable({
    type: v.union(v.literal("direct"), v.literal("group")),
    directKey: v.optional(v.string()),
    name: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastMessageSnippet: v.optional(v.string()),
  })
    .index("by_directKey", ["directKey"])
    .index("by_lastMessageAt", ["lastMessageAt"]),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.optional(v.union(v.literal("admin"), v.literal("member"))),
    joinedAt: v.number(),
    unreadCount: v.number(),
    lastReadAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_conversationId_createdAt", ["conversationId", "createdAt"])
    .index("by_conversationId", ["conversationId"]),

  messageReactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.union(
      v.literal("👍"),
      v.literal("❤️"),
      v.literal("😂"),
      v.literal("😮"),
      v.literal("😢"),
    ),
    createdAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_messageId_userId_emoji", ["messageId", "userId", "emoji"]),

  presenceSessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_sessionId", ["userId", "sessionId"])
    .index("by_updatedAt", ["updatedAt"]),

  typingStates: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),
});
