import type {
  ApplicationTable,
  SnapshotDocument,
  SnapshotTables,
} from "./dataPullSnapshot.ts";

type ChildProcessFailure = {
  code?: unknown;
  message?: unknown;
  stdout?: unknown;
  stderr?: unknown;
};

export type DataPullConfig = {
  productionDeployKey: string;
  productionClerkSubject: string;
  developmentClerkSubject: string;
};

export const parseDataPullConfig = (value: unknown): DataPullConfig => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Data pull configuration must be an object");
  }
  const config = value as Record<string, unknown>;
  const allowedNames = new Set([
    "DATA_SYNC_PRODUCTION_DEPLOY_KEY",
    "DATA_PULL_PRODUCTION_CLERK_SUBJECT",
    "DATA_PULL_DEVELOPMENT_CLERK_SUBJECT",
  ]);
  const productionDeployKey = config.DATA_SYNC_PRODUCTION_DEPLOY_KEY;
  const productionClerkSubject = config.DATA_PULL_PRODUCTION_CLERK_SUBJECT;
  const developmentClerkSubject = config.DATA_PULL_DEVELOPMENT_CLERK_SUBJECT;
  if (
    Object.keys(config).some((name) => !allowedNames.has(name)) ||
    typeof productionDeployKey !== "string" ||
    !/^prod:[^|]+\|[^|]+$/.test(productionDeployKey) ||
    typeof productionClerkSubject !== "string" ||
    typeof developmentClerkSubject !== "string" ||
    !/^user_[a-zA-Z0-9]+$/.test(productionClerkSubject) ||
    !/^user_[a-zA-Z0-9]+$/.test(developmentClerkSubject)
  ) {
    throw new Error(
      "Data pull environment requires one production deploy key and valid production and development Clerk subjects",
    );
  }
  return {
    productionDeployKey,
    productionClerkSubject,
    developmentClerkSubject,
  };
};

const redactOutput = (output: string, secrets: readonly (string | undefined)[]) => {
  let redacted = output;
  for (const secret of secrets
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => right.length - left.length)) {
    redacted = redacted.split(secret).join("<REDACTED>");
  }
  return redacted.replace(/\b(?:prod|dev):[^\s|]+\|[^\s]+/g, (key) => {
    const separator = key.indexOf("|");
    return `${key.slice(0, separator + 1)}<REDACTED>`;
  });
};

export const formatDataPullChildFailure = (
  description: string,
  error: unknown,
  secrets: readonly (string | undefined)[] = [],
) => {
  const failure = (typeof error === "object" && error !== null
    ? error
    : {}) as ChildProcessFailure;
  const code = failure.code === undefined ? "unknown" : String(failure.code);
  const details = [failure.stderr, failure.stdout]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => redactOutput(value.trim(), secrets))
    .join("\n");
  const message = typeof failure.message === "string" ? failure.message : "";
  const redactedMessage = message ? redactOutput(message, secrets) : "";
  const diagnostic = details || redactedMessage;
  return `${description} failed (${code})${diagnostic ? `:\n${diagnostic}` : ""}`;
};

export const dataPullImportArchiveEntries = (
  tables: readonly ApplicationTable[],
) => tables.map((table) => `${table}/documents.jsonl`);

export const selectLocalClearSeeds = (
  tables: readonly ApplicationTable[],
  localSnapshot: SnapshotTables,
  incomingSnapshot: SnapshotTables,
) => {
  const incomingOwnerById = new Map<string, ApplicationTable>();
  for (const table of tables) {
    for (const document of incomingSnapshot[table] ?? []) {
      incomingOwnerById.set(document._id, table);
    }
  }

  const seeds = new Map<ApplicationTable, SnapshotDocument>();
  for (const table of tables) {
    const localDocuments = localSnapshot[table] ?? [];
    if (localDocuments.length === 0) continue;
    const seed = localDocuments.find((document) => {
      const incomingOwner = incomingOwnerById.get(document._id);
      return incomingOwner === undefined || incomingOwner === table;
    });
    if (!seed) {
      throw new Error(
        `Cannot safely stage local ${table}: every existing ID conflicts with an incoming row in another table`,
      );
    }
    seeds.set(table, seed);
  }
  return seeds;
};
