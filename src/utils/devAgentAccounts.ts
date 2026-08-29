export type DevAgentProfile = "user" | "admin";
export type DevAgentConfig = {
  target: { clerkIssuer: string; convexDeployment: string; convexUrl: string };
  accounts: Record<DevAgentProfile, { email: string; externalId: string }>;
};

export const DEV_AGENT_ENV_NAMES = [
  "DEV_AGENT_CLERK_ISSUER",
  "DEV_AGENT_CONVEX_DEPLOYMENT",
  "DEV_AGENT_CONVEX_URL",
  "DEV_AGENT_USER_EMAIL",
  "DEV_AGENT_USER_EXTERNAL_ID",
  "DEV_AGENT_ADMIN_EMAIL",
  "DEV_AGENT_ADMIN_EXTERNAL_ID",
] as const;

// Pure validation only: callers supply private environment values at runtime.
export const devAgentConfig = (
  environment: Record<string, string | undefined>,
): DevAgentConfig => {
  const required = (name: (typeof DEV_AGENT_ENV_NAMES)[number]) => {
    const value = environment[name];
    if (!value?.trim() || value !== value.trim())
      throw new Error(`Missing or invalid ${name}`);
    return value;
  };
  const target = {
    clerkIssuer: required("DEV_AGENT_CLERK_ISSUER"),
    convexDeployment: required("DEV_AGENT_CONVEX_DEPLOYMENT"),
    convexUrl: required("DEV_AGENT_CONVEX_URL"),
  };
  if (
    !/^https:\/\/[a-z0-9-]+\.clerk\.accounts\.dev$/.test(target.clerkIssuer) ||
    !/^dev:[a-z0-9-]+$/.test(target.convexDeployment) ||
    target.convexUrl !==
      `https://${target.convexDeployment.slice(4)}.convex.cloud`
  )
    throw new Error(
      "Dev-agent configuration must name a matching development target",
    );
  const accounts = {
    user: {
      email: required("DEV_AGENT_USER_EMAIL"),
      externalId: required("DEV_AGENT_USER_EXTERNAL_ID"),
    },
    admin: {
      email: required("DEV_AGENT_ADMIN_EMAIL"),
      externalId: required("DEV_AGENT_ADMIN_EXTERNAL_ID"),
    },
  };
  if (
    Object.values(accounts).some(({ email }) =>
      email.toLowerCase().includes("+clerk_test"),
    )
  ) {
    throw new Error(
      "Clerk test email addresses are forbidden for persistent dev agent accounts",
    );
  }
  if (
    accounts.user.email.toLowerCase() === accounts.admin.email.toLowerCase() ||
    accounts.user.externalId === accounts.admin.externalId ||
    Object.values(accounts).some(
      ({ email }) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    )
  )
    throw new Error("Dev accounts must have distinct, valid identities");
  return { target, accounts };
};

export const devAgentProfile = (value: string): DevAgentProfile => {
  if (value !== "user" && value !== "admin") {
    throw new Error("Choose the user or admin dev account");
  }
  return value;
};

export const assertDevAgentTarget = (
  target: DevAgentConfig["target"],
  clerkIssuer: string,
  convexUrl: string,
) => {
  if (clerkIssuer !== target.clerkIssuer || convexUrl !== target.convexUrl) {
    throw new Error(
      "Dev-agent tooling is restricted to the pinned development deployment",
    );
  }
};

export const assertDevAgentIdentity = (
  user: {
    id: string;
    externalId: string | null;
    emailAddresses: { emailAddress: string }[];
    privateMetadata: Record<string, unknown>;
  },
  profile: DevAgentProfile,
  accounts: DevAgentConfig["accounts"],
  expectedId?: string,
) => {
  const expected = accounts[profile];
  if (
    (expectedId && user.id !== expectedId) ||
    user.externalId !== expected.externalId ||
    user.privateMetadata.standardsDevAgent !== profile ||
    user.emailAddresses.length !== 1 ||
    user.emailAddresses[0].emailAddress !== expected.email
  ) {
    throw new Error("Refusing an unexpected or unmarked Clerk account");
  }
};
