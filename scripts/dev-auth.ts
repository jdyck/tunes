import { createClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import {
  assertDevAgentIdentity,
  devAgentProfile,
} from "../src/utils/devAgentAccounts.ts";
import type { DevAgentProfile } from "../src/utils/devAgentAccounts.ts";
import {
  devAuthEnvironment,
  localDevRedirect,
  replaceAgentTask,
  validateAgentTaskUrl,
} from "./lib/devAuth.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const directory = join(root, "local/dev-auth");
const configPath = join(directory, "accounts.json");
type Config = {
  version: 1;
  clerkInstanceId: string;
  clerkIssuer: string;
  convexDeployment: string;
  accounts: Record<DevAgentProfile, string>;
};

const writePrivate = (path: string, data: unknown) => {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const temporary = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  renameSync(temporary, path);
};

const isInactiveAgentTask = (error: unknown) =>
  isClerkAPIResponseError(error) &&
  error.errors.some((item) => item.code === "agent_task_cannot_be_revoked");

const main = async () => {
  const [command, profileArgument = "user", redirectArgument, ...extra] =
    process.argv.slice(2);
  if (
    !["setup", "login", "status", "revoke"].includes(command) ||
    extra.length ||
    (command !== "login" && redirectArgument)
  ) {
    throw new Error(
      "Usage: dev-auth.ts setup | status | login [user|admin] [http://localhost:3000/songs] | revoke [user|admin]",
    );
  }
  const profile = devAgentProfile(profileArgument);
  const redirectUrl = localDevRedirect(redirectArgument);
  const file = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
  const {
    secretKey,
    publishableKey,
    target,
    accounts: expectedAccounts,
  } = devAuthEnvironment(file, process.env);
  const client = createClerkClient({ secretKey, publishableKey });
  console.log(
    `Target: Clerk development ${target.clerkIssuer}; Convex ${target.convexDeployment}`,
  );
  const instance = await client.instance.get();
  if (instance.environmentType !== "development")
    throw new Error("Clerk instance is not development");
  const domains = await client.domains.list();
  if (
    !domains.data.some(
      (domain) =>
        domain.frontendApiUrl.replace(/^https:\/\//, "").replace(/\/$/, "") ===
        new URL(target.clerkIssuer).hostname,
    )
  ) {
    throw new Error(
      "Clerk secret key does not belong to the pinned frontend instance",
    );
  }

  let config: Config | null = existsSync(configPath)
    ? JSON.parse(readFileSync(configPath, "utf8"))
    : null;
  if (
    config &&
    (config.version !== 1 ||
      config.clerkInstanceId !== instance.id ||
      config.clerkIssuer !== target.clerkIssuer ||
      config.convexDeployment !== target.convexDeployment)
  ) {
    throw new Error(
      "Stored account configuration belongs to a different instance or deployment",
    );
  }

  if (command === "setup") {
    const accounts = {} as Record<DevAgentProfile, string>;
    for (const role of ["user", "admin"] as const) {
      const expected = expectedAccounts[role];
      const matches = await client.users.getUserList({
        externalId: [expected.externalId],
        limit: 2,
      });
      if (matches.totalCount > 1)
        throw new Error("Ambiguous dev account identity");
      let user = matches.data[0];
      if (!user) {
        if (config?.accounts[role])
          throw new Error(
            "A pinned dev account is missing; review before recreating it",
          );
        const byEmail = await client.users.getUserList({
          emailAddress: [expected.email],
          limit: 1,
        });
        if (byEmail.totalCount)
          throw new Error("Test email already belongs to an unmarked account");
        user = await client.users.createUser({
          externalId: expected.externalId,
          emailAddress: [expected.email],
          firstName: "Standards Agent",
          lastName: role === "user" ? "User" : "Admin",
          password: `${randomBytes(32).toString("base64url")}aA9!`,
          privateMetadata: { standardsDevAgent: role },
        });
      }
      assertDevAgentIdentity(
        user,
        role,
        expectedAccounts,
        config?.accounts[role],
      );
      accounts[role] = user.id;
      console.log(`Ready: ${role}`);
    }
    config = {
      version: 1,
      clerkInstanceId: instance.id,
      clerkIssuer: target.clerkIssuer,
      convexDeployment: target.convexDeployment,
      accounts,
    };
    writePrivate(configPath, config);
    // Pass only the pinned selector, never a production key or an arbitrary CLI argument.
    const selectorPath = join(directory, "convex.env");
    writeFileSync(
      selectorPath,
      `CONVEX_DEPLOYMENT=${target.convexDeployment}\n`,
      { mode: 0o600 },
    );
    const output = execFileSync(
      process.execPath,
      [
        join(root, "node_modules/convex/bin/main.js"),
        "run",
        "devAgents:seed",
        JSON.stringify({
          userSubject: accounts.user,
          adminSubject: accounts.admin,
        }),
        "--env-file",
        selectorPath,
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          CONVEX_DEPLOYMENT: target.convexDeployment,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    console.log(`Seeded dedicated dev data: ${output.trim()}`);
    return;
  }

  if (!config) throw new Error("Run npm run dev:accounts first");
  for (const role of command === "status"
    ? (["user", "admin"] as const)
    : [profile]) {
    const userId = config.accounts[role];
    if (typeof userId !== "string" || !userId.startsWith("user_"))
      throw new Error("Missing pinned dev account ID");
    const user = await client.users.getUser(userId);
    assertDevAgentIdentity(user, role, expectedAccounts, userId);
  }
  if (command === "status") {
    console.log(
      "Both pinned Clerk dev accounts passed identity checks. No login session created.",
    );
    return;
  }
  const loginPath = join(directory, `login-${profile}.json`);
  if (command === "revoke") {
    const login = JSON.parse(readFileSync(loginPath, "utf8"));
    if (
      login.userId !== config.accounts[profile] ||
      login.clerkInstanceId !== instance.id
    ) {
      throw new Error("Login artifact does not match the pinned dev account");
    }
    await client.agentTasks.revoke(login.agentTaskId);
    writePrivate(loginPath, { profile, revoked: true });
    console.log(
      "Revoked the login task. A previously established browser session may still require logout.",
    );
    return;
  }

  let previousAgentTaskId: string | null = null;
  if (existsSync(loginPath)) {
    const previous = JSON.parse(readFileSync(loginPath, "utf8"));
    if (previous.revoked === true && previous.profile === profile) {
      previousAgentTaskId = null;
    } else if (
      previous.profile === profile &&
      previous.userId === config.accounts[profile] &&
      previous.clerkInstanceId === instance.id &&
      typeof previous.agentTaskId === "string"
    ) {
      previousAgentTaskId = previous.agentTaskId;
    } else {
      throw new Error("Stored login task does not match the pinned dev account");
    }
  }

  const task = await replaceAgentTask({
    previousAgentTaskId,
    revoke: (agentTaskId) => client.agentTasks.revoke(agentTaskId),
    create: () =>
      client.agentTasks.create({
        onBehalfOf: { userId: config.accounts[profile] },
        permissions: "*",
        agentName: "standards-local-dev",
        taskDescription: `Local development browser verification (${profile})`,
        redirectUrl,
        sessionMaxDurationInSeconds: 1_800,
      }),
    persist: (created) =>
      writePrivate(loginPath, {
        profile,
        userId: config.accounts[profile],
        clerkInstanceId: instance.id,
        agentTaskId: created.agentTaskId,
        url: validateAgentTaskUrl(created.url, target.clerkIssuer),
        createdAt: new Date().toISOString(),
        sessionMaxDurationInSeconds: 1_800,
      }),
    isInactive: isInactiveAgentTask,
    onInactive: () =>
      console.log(
        "Previous login task was already consumed or inactive; creating a fresh one.",
      ),
  });
  console.log(`Login ticket saved privately to ${loginPath}`);
  console.log(
    `Open its URL in the supported browser after login approval. Session limit: 30 minutes. Destination: ${redirectUrl}`,
  );
};

main().catch((error: unknown) => {
  if (isClerkAPIResponseError(error)) {
    if (isInactiveAgentTask(error)) {
      console.error(
        "Clerk refused to revoke this task. Revocation is for unused tickets; if already used, log out through the app. No revocation was confirmed.",
      );
      process.exitCode = 1;
      return;
    }
    console.error(
      `Clerk request failed (${error.status}): ${error.errors.map((item) => item.code).join(", ")}`,
    );
  } else if (error && typeof error === "object" && "stderr" in error) {
    console.error(
      "Convex setup failed. Check that devAgents:seed is deployed to the pinned dev target; Clerk accounts were preserved for retry.",
    );
  } else {
    console.error(error instanceof Error ? error.message : "Dev auth failed");
  }
  process.exitCode = 1;
});
