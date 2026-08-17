import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthContext = Pick<QueryCtx | MutationCtx, "auth" | "db">;

export const requireIdentity = async (ctx: AuthContext) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
};

export const getCurrentUser = async (ctx: AuthContext) => {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkTokenIdentifier", (query) =>
      query.eq("clerkTokenIdentifier", identity.tokenIdentifier),
    )
    .unique();

  if (!user) {
    throw new Error("Application User has not been initialized");
  }

  return user;
};

export const requireAdmin = async (ctx: AuthContext) => {
  const user = await getCurrentUser(ctx);
  if (user.role !== "admin") throw new Error("Forbidden");
  return user;
};
