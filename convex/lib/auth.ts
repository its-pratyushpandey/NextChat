import type { MutationCtx, QueryCtx } from "../_generated/server";

export type AuthenticatedContext = QueryCtx | MutationCtx;

export async function requireIdentity(ctx: AuthenticatedContext) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  return identity;
}
