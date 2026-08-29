import { defineApp } from "convex/server";
import migrations from "@convex-dev/migrations/convex.config";
import { v } from "convex/values";

const app = defineApp({
  env: {
    DEV_AGENT_CLERK_ISSUER: v.optional(v.string()),
    DEV_AGENT_CONVEX_DEPLOYMENT: v.optional(v.string()),
    DEV_AGENT_CONVEX_URL: v.optional(v.string()),
    DEV_AGENT_USER_EMAIL: v.optional(v.string()),
    DEV_AGENT_USER_EXTERNAL_ID: v.optional(v.string()),
    DEV_AGENT_ADMIN_EMAIL: v.optional(v.string()),
    DEV_AGENT_ADMIN_EXTERNAL_ID: v.optional(v.string()),
  },
});
app.use(migrations);

export default app;
