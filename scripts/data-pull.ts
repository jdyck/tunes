import { execFile as execFileCallback } from "node:child_process";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { parseEnv, promisify } from "node:util";
import { devAuthEnvironment } from "./lib/devAuth.ts";
import {
  dataPullImportArchiveEntries,
  formatDataPullChildFailure,
  parseDataPullConfig,
  selectLocalClearSeeds,
} from "./lib/dataPullProcess.ts";
import {
  APPLICATION_TABLES,
  documentsToJsonLines,
  filterProductionSnapshot,
  parseDocumentsJsonl,
  type ApplicationTable,
  type SnapshotDocument,
  type SnapshotTables,
} from "./lib/dataPullSnapshot.ts";

const execFile = promisify(execFileCallback);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const convexCli = join(root, "node_modules/convex/bin/main.js");
const dataPullEnvPath = join(root, ".env.data-pull.local");
const localEnvPath = join(root, ".env.local");
const backupsPath = join(root, "local/backups");

const usage = `Usage:
  npm run data:pull
  npm run data:pull:dry-run

The production deploy key and both Clerk subjects must be stored in the private
.env.data-pull.local file. Convex document IDs are not identity input.
`;

type PullOptions = {
  dryRun: boolean;
};

type LocalConfig = ReturnType<typeof devAuthEnvironment>;

const readEnvironmentFile = async (path: string) =>
  parseEnv(await readFile(path, "utf8"));

const assertPrivateFile = async (path: string, description: string) => {
  const file = await stat(path);
  if (!file.isFile() || (file.mode & 0o077) !== 0) {
    throw new Error(`${description} must be a private owner-readable file`);
  }
};

const parseArguments = (arguments_: readonly string[]): PullOptions | null => {
  const options: PullOptions = {
    dryRun: false,
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    switch (argument) {
      case "--help":
        console.log(usage);
        return null;
      case "--dry-run":
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }
  return options;
};

const confirmPull = async (dryRun: boolean) => {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Run data:pull from an interactive terminal");
  }
  const prompt = dryRun
    ? "Export production data and validate the hosted development mapping without replacing development data? [y/N] "
    : "Export production data and replace hosted development application data? [y/N] ";
  const interface_ = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await interface_.question(prompt)).trim().toLowerCase();
    if (answer !== "y" && answer !== "yes") {
      throw new Error("Data pull cancelled");
    }
  } finally {
    interface_.close();
  }
};

const readDataPullConfig = async () => {
  await assertPrivateFile(dataPullEnvPath, "Data pull environment file");
  try {
    return parseDataPullConfig(await readEnvironmentFile(dataPullEnvPath));
  } catch (error) {
    throw new Error(`Invalid data pull configuration in ${dataPullEnvPath}`, {
      cause: error,
    });
  }
};

const readLocalConfig = async (): Promise<LocalConfig> => {
  await assertPrivateFile(localEnvPath, "Local environment file");
  const environment = await readEnvironmentFile(localEnvPath);
  if (environment.CONVEX_PROVISION_HOST) {
    throw new Error("Custom Convex provisioning hosts are not allowed");
  }
  const config = devAuthEnvironment(environment, {});
  return config;
};

const childEnvironment = () => {
  const environment = { ...process.env };
  for (const name of [
    "DATA_SYNC_PRODUCTION_DEPLOY_KEY",
    "DATA_PULL_PRODUCTION_CLERK_SUBJECT",
    "DATA_PULL_DEVELOPMENT_CLERK_SUBJECT",
    "CONVEX_DEPLOY_KEY",
    "CONVEX_DEPLOYMENT_TOKEN",
    "CONVEX_DEPLOYMENT",
    "CONVEX_SELF_HOSTED_URL",
    "CONVEX_SELF_HOSTED_ADMIN_KEY",
    "CONVEX_PROVISION_HOST",
  ]) {
    delete environment[name];
  }
  return environment;
};

const runChild = async (
  command: string,
  arguments_: readonly string[],
  description: string,
  environment: NodeJS.ProcessEnv,
  options: { cwd?: string } = {},
) => {
  try {
    await execFile(command, [...arguments_], {
      cwd: options.cwd ?? root,
      env: environment,
      maxBuffer: 32 * 1024 * 1024,
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(
      formatDataPullChildFailure(description, error, [
        environment.CONVEX_DEPLOY_KEY,
        environment.CONVEX_DEPLOYMENT_TOKEN,
        environment.DATA_SYNC_PRODUCTION_DEPLOY_KEY,
      ]),
    );
  }
};

const readSnapshotDirectory = async (directory: string): Promise<SnapshotTables> => {
  const snapshot = {} as Record<ApplicationTable, SnapshotDocument[]>;
  for (const table of APPLICATION_TABLES) {
    const path = join(directory, table, "documents.jsonl");
    try {
      const file = await stat(path);
      if (!file.isFile()) throw new Error(`Snapshot entry is not a file: ${table}`);
      snapshot[table] = parseDocumentsJsonl(await readFile(path, "utf8"), table);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
        snapshot[table] = [];
        continue;
      }
      throw error;
    }
  }
  return snapshot;
};

const writeFilteredSnapshot = async (
  directory: string,
  tables: Readonly<Record<ApplicationTable, readonly SnapshotDocument[]>>,
) => {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const counts = {} as Record<ApplicationTable, number>;
  for (const table of APPLICATION_TABLES) {
    counts[table] = tables[table].length;
    await writeFile(
      join(directory, `${table}.jsonl`),
      documentsToJsonLines(tables[table]),
      { encoding: "utf8", mode: 0o600 },
    );
  }
  await writeFile(
    join(directory, "manifest.json"),
    `${JSON.stringify({ version: 1, counts }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  return counts;
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  if (!options) return;

  const localConfig = await readLocalConfig();
  const dataPullConfig = await readDataPullConfig();
  const productionDeployment = dataPullConfig.productionDeployKey.slice(
    0,
    dataPullConfig.productionDeployKey.indexOf("|"),
  );
  console.log(
    `Target: ${productionDeployment} production Convex -> ${localConfig.target.convexDeployment} hosted development Convex`,
  );
  await confirmPull(options.dryRun);

  await mkdir(backupsPath, { recursive: true, mode: 0o700 });
  await chmod(backupsPath, 0o700);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "standards-data-pull-"));
  await chmod(temporaryRoot, 0o700);
  const rawProduction = join(temporaryRoot, "production");
  const rawLocal = join(temporaryRoot, "local");
  const filtered = join(temporaryRoot, "filtered");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const productionBackup = join(backupsPath, `production-${timestamp}.zip`);
  const localBackup = join(backupsPath, `dev-before-pull-${timestamp}.zip`);
  await mkdir(rawProduction, { mode: 0o700 });
  await mkdir(rawLocal, { mode: 0o700 });

  try {
    console.log("Exporting the production snapshot...");
    await runChild(
      process.execPath,
      [convexCli, "export", "--path", productionBackup],
      "Production snapshot export",
      {
        ...childEnvironment(),
        CONVEX_DEPLOY_KEY: dataPullConfig.productionDeployKey,
      },
    );
    await chmod(productionBackup, 0o600);
    await runChild(
      "unzip",
      ["-tq", productionBackup],
      "Production snapshot validation",
      childEnvironment(),
    );
    console.log(`Saved production backup: ${productionBackup}`);
    console.log("Validating and extracting the production snapshot...");
    await runChild(
      "unzip",
      ["-q", productionBackup, "-d", rawProduction],
      "Production snapshot extraction",
      childEnvironment(),
    );

    console.log("Exporting the hosted development snapshot...");
    const localSelector = join(temporaryRoot, "local.env");
    await writeFile(
      localSelector,
      `CONVEX_DEPLOYMENT=${localConfig.target.convexDeployment}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    await runChild(
      process.execPath,
      [
        convexCli,
        "export",
        "--path",
        localBackup,
        "--env-file",
        localSelector,
      ],
      "Local development snapshot export",
      childEnvironment(),
    );
    await chmod(localBackup, 0o600);
    console.log("Validating and extracting the hosted development snapshot...");
    await runChild(
      "unzip",
      ["-tq", localBackup],
      "Local development snapshot validation",
      childEnvironment(),
    );
    console.log(`Saved pre-pull local backup: ${localBackup}`);
    await runChild(
      "unzip",
      ["-q", localBackup, "-d", rawLocal],
      "Local development snapshot extraction",
      childEnvironment(),
    );

    const productionSnapshot = await readSnapshotDirectory(rawProduction);
    const localSnapshot = await readSnapshotDirectory(rawLocal);
    const filteredSnapshot = filterProductionSnapshot(
      productionSnapshot,
      localSnapshot,
      {
        productionClerkSubject: dataPullConfig.productionClerkSubject,
        localClerkSubject: dataPullConfig.developmentClerkSubject,
      },
    );
    const counts = await writeFilteredSnapshot(filtered, filteredSnapshot.tables);
    const total = APPLICATION_TABLES.reduce((sum, table) => sum + counts[table], 0);
    console.log(
      `${options.dryRun ? "Dry run validated" : "Filtered"} ${total} app documents across ${APPLICATION_TABLES.length} tables.`,
    );

    if (options.dryRun) {
      console.log("Dry run complete. No development data was replaced and fixtures were not reseeded.");
      return;
    }

    const clearSeeds = selectLocalClearSeeds(
      APPLICATION_TABLES,
      localSnapshot,
      filteredSnapshot.tables,
    );
    const clearDirectory = join(filtered, "clear");
    await mkdir(clearDirectory, { mode: 0o700 });
    for (const table of APPLICATION_TABLES) {
      const seed = clearSeeds.get(table);
      if (!seed) continue;
      const seedPath = join(clearDirectory, `${table}.jsonl`);
      await writeFile(seedPath, documentsToJsonLines([seed]), {
        encoding: "utf8",
        mode: 0o600,
      });
      console.log(`Clearing stale local ${table} data...`);
      await runChild(
        process.execPath,
        [
          convexCli,
          "import",
          "--table",
          table,
          "--format",
          "jsonLines",
          "--replace",
          "--yes",
          seedPath,
          "--env-file",
          localSelector,
        ],
        `Hosted development staging replacement for ${table}`,
        childEnvironment(),
      );
    }

    const filteredZipSource = join(filtered, "archive");
    for (const table of APPLICATION_TABLES) {
      const tableDirectory = join(filteredZipSource, table);
      await mkdir(tableDirectory, { recursive: true, mode: 0o700 });
      await writeFile(
        join(tableDirectory, "documents.jsonl"),
        documentsToJsonLines(filteredSnapshot.tables[table]),
        { encoding: "utf8", mode: 0o600 },
      );
    }
    const filteredZip = join(temporaryRoot, "filtered-import.zip");
    await runChild(
      "zip",
      [
        "-q",
        "-X",
        "-r",
        filteredZip,
        ...dataPullImportArchiveEntries(APPLICATION_TABLES),
      ],
      "Filtered local import archive creation",
      childEnvironment(),
      { cwd: filteredZipSource },
    );
    console.log("Importing the filtered application snapshot into hosted development data...");
    await runChild(
      process.execPath,
      [
        convexCli,
        "import",
        "--replace",
        "--yes",
        filteredZip,
        "--env-file",
        localSelector,
      ],
      "Local application snapshot import",
      childEnvironment(),
    );

    const postImportRaw = join(temporaryRoot, "post-import");
    await mkdir(postImportRaw, { mode: 0o700 });
    console.log("Verifying the hosted development replacement...");
    await runChild(
      process.execPath,
      [
        convexCli,
        "export",
        "--path",
        join(temporaryRoot, "post-import.zip"),
        "--env-file",
        localSelector,
      ],
      "Post-import hosted development snapshot export",
      childEnvironment(),
    );
    await runChild(
      "unzip",
      ["-q", join(temporaryRoot, "post-import.zip"), "-d", postImportRaw],
      "Post-import hosted development snapshot extraction",
      childEnvironment(),
    );
    const importedSnapshot = await readSnapshotDirectory(postImportRaw);
    for (const table of APPLICATION_TABLES) {
      const expectedIds = new Set(
        filteredSnapshot.tables[table].map((document) => document._id),
      );
      const actualIds = new Set(
        importedSnapshot[table]?.map((document) => document._id) ?? [],
      );
      if (
        actualIds.size !== expectedIds.size ||
        [...expectedIds].some((id) => !actualIds.has(id))
      ) {
        throw new Error(`Post-import verification failed for ${table}`);
      }
    }
    console.log("Local replacement row counts and document IDs verified.");
    console.log("Restoring dedicated local development fixtures...");
    await runChild(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev:accounts"],
      "Local development fixture restoration",
      childEnvironment(),
    );
    console.log("Local development data replaced and dedicated fixtures restored.");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 2 });
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Data pull failed");
  process.exitCode = 1;
});
