import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

const PAGE_SIZE = 1_000;
const TABLES = [
  { name: "artists", order: "id.asc" },
  { name: "artist_user_data", order: "user_id.asc,artist_id.asc" },
  { name: "recording_artist_credits", order: "id.asc" },
  { name: "recordings", order: "id.asc" },
  {
    name: "recording_youtube_items",
    order: "recording_id.asc,youtube_video_id.asc",
  },
  { name: "release_groups", order: "id.asc" },
  { name: "site_admins", order: "user_id.asc" },
  { name: "song_user_data", order: "user_id.asc,song_id.asc" },
  { name: "song_artist_credits", order: "id.asc" },
  { name: "songs", order: "id.asc" },
  {
    name: "user_recording_data",
    order: "user_id.asc,recording_id.asc",
  },
  { name: "youtube_items", order: "video_id.asc" },
];

const decodeEnvValue = (rawValue) => {
  const value = rawValue.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

const loadEnvFile = async (filePath) => {
  let contents;
  try {
    contents = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const line of contents.split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/u);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] === undefined) {
      process.env[key] = decodeEnvValue(rawValue);
    }
  }
};

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const getOutputArgument = () => {
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex === -1) return null;
  const output = process.argv[outputIndex + 1];
  if (!output || output.startsWith("--")) {
    throw new Error("--output requires a directory path");
  }
  return output;
};

const fetchTable = async ({ baseUrl, serviceRoleKey, name, order }) => {
  const rows = [];
  let expectedTotal = null;

  while (expectedTotal === null || rows.length < expectedTotal) {
    const from = rows.length;
    const to = from + PAGE_SIZE - 1;
    const url = new URL(`/rest/v1/${name}`, baseUrl);
    url.searchParams.set("select", "*");
    url.searchParams.set("order", order);

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        Range: `${from}-${to}`,
        Prefer: "count=exact",
        apikey: serviceRoleKey,
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Could not export ${name}: ${response.status} ${detail.slice(0, 300)}`,
      );
    }

    const contentRange = response.headers.get("content-range");
    const totalMatch = contentRange?.match(/\/(\d+)$/u);
    if (!totalMatch) {
      throw new Error(`Supabase did not return an exact row count for ${name}`);
    }
    const pageTotal = Number(totalMatch[1]);
    if (expectedTotal !== null && pageTotal !== expectedTotal) {
      throw new Error(
        `${name} changed during export (${expectedTotal} rows became ${pageTotal})`,
      );
    }
    expectedTotal = pageTotal;

    const page = await response.json();
    if (!Array.isArray(page)) {
      throw new Error(`Supabase returned a non-array payload for ${name}`);
    }
    rows.push(...page);

    if (page.length === 0 && rows.length < expectedTotal) {
      throw new Error(`Supabase pagination stopped early for ${name}`);
    }
  }

  if (rows.length !== expectedTotal) {
    throw new Error(
      `${name} count mismatch: expected ${expectedTotal}, received ${rows.length}`,
    );
  }
  return rows;
};

const latestSchemaVersion = async () => {
  const migrations = (await readdir(path.resolve("supabase/migrations")))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  if (migrations.length === 0) {
    throw new Error("No Supabase migrations found");
  }
  return migrations.at(-1);
};

await loadEnvFile(path.resolve(".env.local"));

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

const exportedAt = new Date().toISOString();
const timestamp = exportedAt.replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
const requestedOutput = getOutputArgument();
const outputDir = path.resolve(
  requestedOutput ?? `local/snapshots/supabase-${timestamp}`,
);
const workDir = `${outputDir}.incomplete-${randomUUID()}`;

await mkdir(path.dirname(outputDir), { recursive: true });
await mkdir(workDir);

const manifestTables = [];
let totalRows = 0;

for (const table of TABLES) {
  const rows = await fetchTable({
    baseUrl,
    serviceRoleKey,
    ...table,
  });
  const serialized = `${JSON.stringify(rows, null, 2)}\n`;
  const file = `${table.name}.json`;
  await writeFile(path.join(workDir, file), serialized, { flag: "wx" });

  const verification = await readFile(path.join(workDir, file), "utf8");
  const parsed = JSON.parse(verification);
  if (!Array.isArray(parsed) || parsed.length !== rows.length) {
    throw new Error(`Written snapshot verification failed for ${table.name}`);
  }

  manifestTables.push({
    table: table.name,
    file,
    rowCount: rows.length,
    bytes: Buffer.byteLength(serialized),
    sha256: sha256(serialized),
  });
  totalRows += rows.length;
  console.log(`${table.name}: ${rows.length} rows`);
}

const manifest = {
  formatVersion: 1,
  exportedAt,
  source: new URL(baseUrl).origin,
  sourceSchemaVersion: await latestSchemaVersion(),
  consistency:
    "Each table has an exact count; the REST export is not one cross-table transaction.",
  excludes: ["auth users", "passwords", "sessions", "API keys", "secrets"],
  totalRows,
  tables: manifestTables,
};
await writeFile(
  path.join(workDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { flag: "wx" },
);

await rename(workDir, outputDir);
console.log(`Snapshot verified: ${totalRows} rows across ${TABLES.length} tables`);
console.log(`Saved to ${outputDir}`);
