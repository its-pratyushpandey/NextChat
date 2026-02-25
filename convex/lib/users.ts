import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireIdentity } from "./auth";

function identityToName(identity: {
  name?: string | null;
  nickname?: string | null;
  preferredUsername?: string | null;
  email?: string | null;
}) {
  return (
    identity.name ||
    identity.nickname ||
    identity.preferredUsername ||
    identity.email ||
    "Unknown"
  );
}

export async function getMe(ctx: QueryCtx): Promise<Doc<"users"> | null> {
  return await getMeForAnyCtx(ctx);
}

export async function getMeForAnyCtx(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
}

export async function ensureMe(ctx: MutationCtx): Promise<Doc<"users">> {
  const identity = await requireIdentity(ctx);
  const clerkUserId = identity.subject;
  const now = Date.now();

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();

  const patch = {
    name: identityToName(identity),
    email: identity.email ?? undefined,
    imageUrl: identity.pictureUrl ?? undefined,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing;
  }

  const userId = await ctx.db.insert("users", {
    clerkUserId,
    ...patch,
    createdAt: now,
  });

  const created = await ctx.db.get("users", userId);
  if (!created) {
    throw new Error("Failed to create user");
  }
  return created;
}
