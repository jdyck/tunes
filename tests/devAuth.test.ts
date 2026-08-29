import assert from "node:assert/strict";
import test from "node:test";
import {
  devAuthEnvironment,
  localDevRedirect,
  replaceAgentTask,
  validateAgentTaskUrl,
} from "../scripts/lib/devAuth.ts";
import {
  devAgentConfig,
  DEV_AGENT_ENV_NAMES,
  assertDevAgentIdentity,
  assertDevAgentTarget,
  devAgentProfile,
} from "../src/utils/devAgentAccounts.ts";
import { devAgentEnvironment } from "./fixtures/devAgentEnvironment.ts";

const { target, accounts } = devAgentConfig(devAgentEnvironment);

const environment = {
  ...devAgentEnvironment,
  CLERK_SECRET_KEY: "sk_test_fixture_not_a_real_key",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from(`${new URL(target.clerkIssuer).hostname}$`).toString("base64")}`,
  CONVEX_DEPLOYMENT: target.convexDeployment,
  NEXT_PUBLIC_CONVEX_URL: target.convexUrl,
};

test("dev login requires matching development configuration with no deployment overrides", () => {
  assert.equal(
    devAuthEnvironment(environment, {}).secretKey,
    environment.CLERK_SECRET_KEY,
  );
  for (const override of [
    { CLERK_SECRET_KEY: "sk_live_forbidden" },
    { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_forbidden" },
    { CONVEX_DEPLOYMENT: "prod:forbidden" },
    { NEXT_PUBLIC_CONVEX_URL: "https://some-other.convex.cloud" },
    { CONVEX_DEPLOY_KEY: "forbidden" },
    { CONVEX_SELF_HOSTED_URL: "http://localhost:3210" },
    { DEV_AGENT_CONVEX_DEPLOYMENT: "prod:forbidden" },
    { DEV_AGENT_CLERK_ISSUER: "https://clerk.production.example" },
    { DEV_AGENT_CONVEX_URL: "https://other.convex.cloud" },
    { DEV_AGENT_ADMIN_EMAIL: devAgentEnvironment.DEV_AGENT_USER_EMAIL },
    {
      DEV_AGENT_USER_EXTERNAL_ID:
        devAgentEnvironment.DEV_AGENT_ADMIN_EXTERNAL_ID,
    },
  ])
    assert.throws(() =>
      devAuthEnvironment({ ...environment, ...override }, {}),
    );
  for (const override of [
    { NODE_ENV: "production" },
    { VERCEL: "1" },
    { CONVEX_DEPLOY_KEY: "forbidden" },
    { CLERK_SECRET_KEY: "sk_test_different" },
    { CONVEX_DEPLOYMENT: "prod:forbidden" },
    { DEV_AGENT_ADMIN_EMAIL: "other@example.invalid" },
  ])
    assert.throws(() => devAuthEnvironment(environment, override));
  assert.throws(() =>
    assertDevAgentTarget(
      target,
      target.clerkIssuer,
      "https://production.convex.cloud",
    ),
  );
  for (const name of DEV_AGENT_ENV_NAMES) {
    assert.throws(
      () => devAuthEnvironment({ ...environment, [name]: undefined }, {}),
      /Missing or invalid/,
    );
  }
  for (const unsafeEmail of [
    "agent+clerk_test@example.com",
    "agent+clerk_test_admin@example.com",
    "agent+CLERK_TEST@example.com",
  ]) {
    assert.throws(
      () =>
        devAgentConfig({
          ...devAgentEnvironment,
          DEV_AGENT_ADMIN_EMAIL: unsafeEmail,
        }),
      /Clerk test email addresses are forbidden/,
    );
  }
});

test("a new login revokes the prior pending Agent Task before replacing it", async () => {
  const events: string[] = [];
  const task = await replaceAgentTask({
    previousAgentTaskId: "task_old",
    revoke: async (id) => {
      events.push(`revoke:${id}`);
    },
    create: async () => {
      events.push("create");
      return { agentTaskId: "task_new", url: "https://clerk.test/ticket" };
    },
    persist: async ({ agentTaskId }) => {
      events.push(`persist:${agentTaskId}`);
    },
    isInactive: () => false,
  });
  assert.equal(task.agentTaskId, "task_new");
  assert.deepEqual(events, ["revoke:task_old", "create", "persist:task_new"]);
});

test("a consumed prior task does not block a new login, but other revoke failures do", async () => {
  const consumed = new Error("consumed");
  let created = 0;
  await replaceAgentTask({
    previousAgentTaskId: "task_consumed",
    revoke: async () => {
      throw consumed;
    },
    create: async () => ({
      agentTaskId: `task_new_${++created}`,
      url: "https://clerk.test/ticket",
    }),
    persist: async () => {},
    isInactive: (error) => error === consumed,
  });
  assert.equal(created, 1);

  await assert.rejects(
    replaceAgentTask({
      previousAgentTaskId: "task_pending",
      revoke: async () => {
        throw new Error("network failure");
      },
      create: async () => ({
        agentTaskId: `task_new_${++created}`,
        url: "https://clerk.test/ticket",
      }),
      persist: async () => {},
      isInactive: () => false,
    }),
    /network failure/,
  );
  assert.equal(created, 1);
});

test("a newly created task is revoked when its private artifact cannot be saved", async () => {
  const revoked: string[] = [];
  await assert.rejects(
    replaceAgentTask({
      previousAgentTaskId: null,
      revoke: async (id) => {
        revoked.push(id);
      },
      create: async () => ({
        agentTaskId: "task_new",
        url: "https://clerk.test/ticket",
      }),
      persist: async () => {
        throw new Error("disk full");
      },
      isInactive: () => false,
    }),
    /disk full/,
  );
  assert.deepEqual(revoked, ["task_new"]);
});

test("login destinations stay on local app pages and tickets stay on the pinned Clerk issuer", () => {
  assert.equal(localDevRedirect(), "http://localhost:3000/songs");
  assert.equal(
    localDevRedirect("http://127.0.0.1:3001/artists"),
    "http://127.0.0.1:3001/artists",
  );
  for (const value of [
    "https://example.com/songs",
    "http://localhost.evil.test/songs",
    "http://user:pass@localhost:3000/songs",
    "http://localhost:3000/login?redirect_url=https://example.com",
    "http://localhost:3000/api/delete",
    "http://localhost:3000/songs#secret",
    "http://localhost:3000/songs?foo=bar",
  ])
    assert.throws(() => localDevRedirect(value));
  assert.equal(
    validateAgentTaskUrl(
      `${target.clerkIssuer}/test-ticket`,
      target.clerkIssuer,
    ),
    `${target.clerkIssuer}/test-ticket`,
  );
  assert.throws(() =>
    validateAgentTaskUrl("https://accounts.google.com/", target.clerkIssuer),
  );
  assert.throws(() =>
    validateAgentTaskUrl(
      target.clerkIssuer.replace("https:", "http:"),
      target.clerkIssuer,
    ),
  );
});

test("only the two marked dev accounts can receive a login session", () => {
  const user = {
    id: "user_fixture",
    externalId: accounts.user.externalId,
    emailAddresses: [{ emailAddress: accounts.user.email }],
    privateMetadata: { standardsDevAgent: "user" },
  };
  assert.doesNotThrow(() =>
    assertDevAgentIdentity(user, "user", accounts, "user_fixture"),
  );
  assert.throws(() => assertDevAgentIdentity(user, "admin", accounts));
  assert.throws(() =>
    assertDevAgentIdentity(user, "user", accounts, "user_owner"),
  );
  assert.throws(() =>
    assertDevAgentIdentity({ ...user, externalId: null }, "user", accounts),
  );
  assert.throws(() =>
    assertDevAgentIdentity({ ...user, privateMetadata: {} }, "user", accounts),
  );
  assert.throws(() =>
    assertDevAgentIdentity(
      { ...user, emailAddresses: [{ emailAddress: "owner@example.com" }] },
      "user",
      accounts,
    ),
  );
  assert.equal(devAgentProfile("user"), "user");
  assert.throws(() => devAgentProfile("owner"));
});
