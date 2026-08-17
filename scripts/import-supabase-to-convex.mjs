import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const EXPECTED_TABLES = [
  "artists",
  "artist_user_data",
  "recording_artist_credits",
  "recordings",
  "recording_youtube_items",
  "release_groups",
  "site_admins",
  "song_artist_credits",
  "song_user_data",
  "songs",
  "user_recording_data",
  "youtube_items",
];

const getArgument = (name) => {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} requires a value`);
  }
  return value;
};

const snapshotArgument = getArgument("--snapshot");
const deployment = getArgument("--deployment");
const dryRun = process.argv.includes("--dry-run");
const batchSize = Number(getArgument("--batch-size") ?? "100");

if (!snapshotArgument || !deployment) {
  throw new Error(
    "Usage: npm run import:convex -- --snapshot <directory> --deployment <dev deployment> [--dry-run]",
  );
}
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 250) {
  throw new Error("--batch-size must be an integer from 1 through 250");
}
if (deployment === "prod" && !process.argv.includes("--allow-production")) {
  throw new Error("Production imports require --allow-production and fresh approval");
}

const snapshotDir = path.resolve(snapshotArgument);
const manifestPath = path.join(snapshotDir, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.formatVersion !== 1 || !Array.isArray(manifest.tables)) {
  throw new Error("Unsupported or invalid snapshot manifest");
}

const manifestNames = manifest.tables.map((entry) => entry.table).sort();
if (JSON.stringify(manifestNames) !== JSON.stringify([...EXPECTED_TABLES].sort())) {
  throw new Error("Snapshot manifest does not contain the expected table set");
}

const tables = new Map();
let totalRows = 0;
for (const entry of manifest.tables) {
  const data = await readFile(path.join(snapshotDir, entry.file));
  const hash = createHash("sha256").update(data).digest("hex");
  const rows = JSON.parse(data);
  if (!Array.isArray(rows)) throw new Error(`${entry.file} is not a JSON array`);
  if (
    hash !== entry.sha256 ||
    data.byteLength !== entry.bytes ||
    rows.length !== entry.rowCount
  ) {
    throw new Error(`Manifest verification failed for ${entry.file}`);
  }
  tables.set(entry.table, rows);
  totalRows += rows.length;
}
if (totalRows !== manifest.totalRows) {
  throw new Error("Snapshot manifest total does not match its table files");
}

const ids = (table, field = "id") =>
  new Set(tables.get(table).map((row) => row[field]));
const assertReferences = (table, field, targetIds) => {
  const missing = tables
    .get(table)
    .filter((row) => row[field] !== null && !targetIds.has(row[field]));
  if (missing.length > 0) {
    throw new Error(`${table}.${field} has ${missing.length} missing references`);
  }
};

const songIds = ids("songs");
const artistIds = ids("artists");
const recordingIds = ids("recordings");
const releaseGroupIds = ids("release_groups");
const youtubeVideoIds = ids("youtube_items", "video_id");

assertReferences("song_user_data", "song_id", songIds);
assertReferences("song_artist_credits", "song_id", songIds);
assertReferences("song_artist_credits", "artist_id", artistIds);
assertReferences("artist_user_data", "artist_id", artistIds);
assertReferences("recordings", "song_id", songIds);
assertReferences("recordings", "release_group_id", releaseGroupIds);
assertReferences("user_recording_data", "recording_id", recordingIds);
assertReferences("recording_artist_credits", "recording_id", recordingIds);
assertReferences("recording_artist_credits", "artist_id", artistIds);
assertReferences("recording_youtube_items", "recording_id", recordingIds);
assertReferences(
  "recording_youtube_items",
  "youtube_video_id",
  youtubeVideoIds,
);

const siteAdmins = tables.get("site_admins");
if (siteAdmins.length !== 1) {
  throw new Error(`Expected one Supabase Site Admin, found ${siteAdmins.length}`);
}
const legacyOwnerId = siteAdmins[0].user_id;

const ownerRows = (table) =>
  tables.get(table).filter((row) => row.user_id === legacyOwnerId);
const nonOwnerRows = (table) =>
  tables.get(table).filter((row) => row.user_id !== legacyOwnerId);

const ownerSongData = ownerRows("song_user_data");
const ownerArtistData = ownerRows("artist_user_data");
const sourceOwnerRecordingData = ownerRows("user_recording_data");
const skippedPrivateRows =
  nonOwnerRows("song_user_data").length +
  nonOwnerRows("artist_user_data").length +
  nonOwnerRows("user_recording_data").length;

const recordingSongById = new Map(
  tables.get("recordings").map((row) => [row.id, row.song_id]),
);
const recordingGroups = new Map();
for (const row of sourceOwnerRecordingData) {
  const songId = recordingSongById.get(row.recording_id);
  if (!songId) throw new Error(`Recording membership is missing its Song`);
  const group = recordingGroups.get(songId) ?? [];
  group.push(row);
  recordingGroups.set(songId, group);
}

const ownerRecordingData = [];
for (const group of recordingGroups.values()) {
  group.sort((left, right) => {
    const leftOrder = left.sort_order ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sort_order ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder || left.recording_id.localeCompare(right.recording_id);
  });
  group.forEach((row, sortOrder) => {
    ownerRecordingData.push({
      ...row,
      sort_order: sortOrder,
      created_at: manifest.exportedAt,
    });
  });
}

const expectedCounts = {
  artists: tables.get("artists").length,
  artistUserData: ownerArtistData.length,
  recordingArtistCredits: tables.get("recording_artist_credits").length,
  recordings: tables.get("recordings").length,
  recordingYoutubeItems: tables.get("recording_youtube_items").length,
  releaseGroups: tables.get("release_groups").length,
  songArtistCredits: tables.get("song_artist_credits").length,
  songs: tables.get("songs").length,
  songUserData: ownerSongData.length,
  userRecordingData: ownerRecordingData.length,
  youtubeItems: tables.get("youtube_items").length,
};

console.log(
  `Snapshot verified: ${manifest.totalRows} source rows across ${manifest.tables.length} tables`,
);
console.log(
  `Owner import: ${ownerSongData.length} Song rows, ${ownerArtistData.length} Artist rows, ${ownerRecordingData.length} Recording rows`,
);
console.log(`Preserved but not imported: ${skippedPrivateRows} non-owner private rows`);
console.log(
  `Normalized ${sourceOwnerRecordingData.filter((row) => row.sort_order === null).length} null Recording positions and ${tables.get("recordings").filter((row) => row.kind === null).length} null Recording kinds`,
);

if (dryRun) {
  console.log("Dry run complete; Convex was not changed");
  process.exit(0);
}

const callConvex = (functionName, args) => {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    command,
    [
      "convex",
      "run",
      functionName,
      JSON.stringify(args),
      "--deployment",
      deployment,
      "--typecheck",
      "disable",
      "--codegen",
      "disable",
    ],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${functionName} failed:\n${result.stderr || result.stdout}`,
    );
  }
  const output = result.stdout.trim();
  return output ? JSON.parse(output) : null;
};

const importBatches = (label, functionName, rows, extraArgs = {}) => {
  let inserted = 0;
  let updated = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    const result = callConvex(functionName, { ...extraArgs, rows: batch });
    inserted += result.inserted;
    updated += result.updated;
  }
  console.log(`${label}: ${rows.length} rows (${inserted} inserted, ${updated} updated)`);
};

const ownerBinding = callConvex("migration:bindOwner", { legacyUserId: legacyOwnerId });
console.log(`Owner binding: ${ownerBinding.updated ? "created" : "already present"}`);

importBatches("artists", "migration:importArtists", tables.get("artists"));
importBatches("songs", "migration:importSongs", tables.get("songs"));
importBatches(
  "release_groups",
  "migration:importReleaseGroups",
  tables.get("release_groups"),
);
importBatches(
  "youtube_items",
  "migration:importYoutubeItems",
  tables.get("youtube_items"),
);
importBatches(
  "song_artist_credits",
  "migration:importSongArtistCredits",
  tables.get("song_artist_credits"),
);
importBatches(
  "recordings",
  "migration:importRecordings",
  tables.get("recordings"),
);
importBatches(
  "recording_artist_credits",
  "migration:importRecordingArtistCredits",
  tables.get("recording_artist_credits"),
);
importBatches(
  "recording_youtube_items",
  "migration:importRecordingYoutubeItems",
  tables.get("recording_youtube_items"),
);
importBatches("song_user_data", "migration:importSongUserData", ownerSongData, {
  legacyOwnerId,
});
importBatches(
  "artist_user_data",
  "migration:importArtistUserData",
  ownerArtistData,
  { legacyOwnerId },
);
importBatches(
  "user_recording_data",
  "migration:importUserRecordingData",
  ownerRecordingData,
  { legacyOwnerId },
);

const actualCounts = callConvex("migration:verifyOwnerSnapshot", {
  legacyOwnerId,
});
for (const [name, expected] of Object.entries(expectedCounts)) {
  if (actualCounts[name] !== expected) {
    throw new Error(
      `${name} verification failed: expected ${expected}, found ${actualCounts[name]}`,
    );
  }
}
console.log(`Convex verification passed on ${deployment}`);
