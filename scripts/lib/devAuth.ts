import {
  DEV_AGENT_ENV_NAMES,
  devAgentConfig,
} from "../../src/utils/devAgentAccounts.ts";

type AgentTaskRecord = { agentTaskId: string };

export const replaceAgentTask = async <Task extends AgentTaskRecord>({
  previousAgentTaskId,
  revoke,
  create,
  persist,
  isInactive,
  onInactive,
}: {
  previousAgentTaskId: string | null;
  revoke: (agentTaskId: string) => Promise<unknown>;
  create: () => Promise<Task>;
  persist: (task: Task) => void | Promise<void>;
  isInactive: (error: unknown) => boolean;
  onInactive?: () => void;
}) => {
  if (previousAgentTaskId) {
    try {
      await revoke(previousAgentTaskId);
    } catch (error) {
      if (!isInactive(error)) throw error;
      onInactive?.();
    }
  }

  const task = await create();
  try {
    await persist(task);
  } catch (error) {
    try {
      await revoke(task.agentTaskId);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Could not save or revoke the new Clerk Agent Task",
      );
    }
    throw error;
  }
  return task;
};

export const devAuthEnvironment = (
  file: Record<string, string | undefined>,
  environment: Record<string, string | undefined>,
) => {
  for (const name of [
    "CONVEX_DEPLOY_KEY",
    "CONVEX_SELF_HOSTED_URL",
    "CONVEX_SELF_HOSTED_ADMIN_KEY",
  ]) {
    if (file[name] || environment[name])
      throw new Error(`Remove ${name} before using dev-agent tooling`);
  }
  for (const name of [
    "CLERK_SECRET_KEY",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    "CONVEX_DEPLOYMENT",
    "NEXT_PUBLIC_CONVEX_URL",
    ...DEV_AGENT_ENV_NAMES,
  ]) {
    if (environment[name] && environment[name] !== file[name]) {
      throw new Error(`Conflicting ${name} environment override`);
    }
  }
  if (
    environment.NODE_ENV === "production" ||
    file.NODE_ENV === "production" ||
    environment.VERCEL ||
    file.VERCEL
  ) {
    throw new Error("Run dev-agent tooling locally, outside production");
  }
  const secretKey = file.CLERK_SECRET_KEY;
  const config = devAgentConfig(file);
  const publishableKey = file.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (
    !secretKey?.startsWith("sk_test_") ||
    !publishableKey?.startsWith("pk_test_")
  ) {
    throw new Error("Clerk development keys are required");
  }
  const issuer = `https://${Buffer.from(publishableKey.slice(8), "base64").toString().replace(/\$$/, "")}`;
  if (
    issuer !== config.target.clerkIssuer ||
    file.CONVEX_DEPLOYMENT !== config.target.convexDeployment ||
    file.NEXT_PUBLIC_CONVEX_URL !== config.target.convexUrl
  )
    throw new Error(
      "Configuration does not match the pinned development target",
    );
  return { secretKey, publishableKey, ...config };
};

export const localDevRedirect = (value = "http://localhost:3000/songs") => {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/(songs|artists|song\/[a-zA-Z0-9]+|artist\/[a-zA-Z0-9]+)$/.test(
      url.pathname,
    )
  )
    throw new Error(
      "Redirect must be a local HTTP Songs or Artists page, without credentials or query parameters",
    );
  return url.href;
};

export const validateAgentTaskUrl = (value: string, clerkIssuer: string) => {
  const url = new URL(value);
  if (url.origin !== clerkIssuer || url.username || url.password) {
    throw new Error("Clerk returned an unexpected login destination");
  }
  return value;
};
