import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireIdentity } from "./model/auth";

export const ensureCurrent = mutation({
  args: {},
  returns: v.id("users"),
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkTokenIdentifier", (query) =>
        query.eq("clerkTokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    const email = typeof identity.email === "string" ? identity.email : null;
    if (existing) {
      if (existing.email !== email) {
        await ctx.db.patch(existing._id, { email });
      }
      return existing._id;
    }

    return ctx.db.insert("users", {
      clerkTokenIdentifier: identity.tokenIdentifier,
      clerkSubject: identity.subject,
      email,
      legacySupabaseId: null,
      role: "user",
    });
  },
});

export const current = query({
  args: {},
  returns: v.object({
    id: v.id("users"),
    email: v.union(v.string(), v.null()),
    role: v.union(v.literal("user"), v.literal("admin")),
  }),
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return {
      id: user._id,
      email: user.email,
      role: user.role,
    };
  },
});

export const setRole = internalMutation({
  args: {
    clerkSubject: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkSubject", (query) =>
        query.eq("clerkSubject", args.clerkSubject),
      )
      .unique();
    if (!user) throw new Error("Application User not found");
    await ctx.db.patch(user._id, { role: args.role });
    return user._id;
  },
});
