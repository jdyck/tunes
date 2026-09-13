import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  dataPullImportArchiveEntries,
  formatDataPullChildFailure,
  parseDataPullConfig,
  selectLocalClearSeeds,
} from "../scripts/lib/dataPullProcess.ts";
import {
  APPLICATION_TABLES,
  NON_PORTABLE_APPLICATION_TABLES,
  documentsToJsonLines,
  filterProductionSnapshot,
  parseDocumentsJsonl,
  type SnapshotDocument,
} from "../scripts/lib/dataPullSnapshot.ts";

const document = (
  id: string,
  fields: Record<string, unknown> = {},
): SnapshotDocument => ({
  _id: id,
  _creationTime: 1,
  ...fields,
});

const emptySnapshot = (): Record<string, SnapshotDocument[]> =>
  Object.fromEntries(APPLICATION_TABLES.map((table) => [table, []]));

test("data pull accounts for every application table in the Convex schema", () => {
  const schema = readFileSync(
    new URL("../convex/schema.ts", import.meta.url),
    "utf8",
  );
  const schemaTables = [...schema.matchAll(/^  ([a-zA-Z][a-zA-Z0-9]*): defineTable\(/gm)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(
    [...APPLICATION_TABLES, ...NON_PORTABLE_APPLICATION_TABLES].sort(),
    schemaTables,
  );
  assert.deepEqual(NON_PORTABLE_APPLICATION_TABLES, ["songFiles"]);
});

test("data pull config selects the browser development User independently of agent fixtures", () => {
  const config = parseDataPullConfig({
    DATA_SYNC_PRODUCTION_DEPLOY_KEY: "prod:example|secret",
    DATA_PULL_PRODUCTION_CLERK_SUBJECT: "user_productionowner",
    DATA_PULL_DEVELOPMENT_CLERK_SUBJECT: "user_browserdevelopment",
  });

  assert.equal(config.productionDeployKey, "prod:example|secret");
  assert.equal(config.productionClerkSubject, "user_productionowner");
  assert.equal(config.developmentClerkSubject, "user_browserdevelopment");
});

const productionSnapshot = () => {
  const snapshot = emptySnapshot();
  snapshot.users = [
    document("prod-user", {
      clerkSubject: "user_production_owner",
      role: "user",
    }),
    document("other-prod-user", {
      clerkSubject: "user_other",
      role: "user",
    }),
  ];
  snapshot.songs = [
    document("song-selected", { name: "Selected Song" }),
    document("song-other", { name: "Other Song" }),
  ];
  snapshot.songUserData = [
    document("private-song-selected", {
      userId: "prod-user",
      songId: "song-selected",
      notes: "keep this",
    }),
    document("private-song-other", {
      userId: "other-prod-user",
      songId: "song-other",
    }),
  ];
  snapshot.artists = [
    document("artist-songwriter", { name: "Songwriter" }),
    document("artist-performer", { name: "Performer" }),
    document("artist-personnel", { name: "Personnel" }),
    document("artist-release", { name: "Release Artist" }),
    document("artist-private", { name: "Private Artist" }),
    document("artist-other", { name: "Other Artist" }),
  ];
  snapshot.artistUserData = [
    document("private-artist-selected", {
      userId: "prod-user",
      artistId: "artist-private",
    }),
    document("private-artist-other", {
      userId: "other-prod-user",
      artistId: "artist-other",
    }),
  ];
  snapshot.recordings = [
    document("recording-selected", {
      songId: "song-selected",
      releaseGroupId: "release-group-selected",
    }),
    document("recording-also-on-song", {
      songId: "song-selected",
      releaseGroupId: null,
    }),
    document("recording-other", {
      songId: "song-other",
      releaseGroupId: "release-group-other",
    }),
  ];
  snapshot.userRecordingData = [
    document("private-recording-selected", {
      userId: "prod-user",
      recordingId: "recording-selected",
      songId: "song-selected",
    }),
    document("private-recording-other", {
      userId: "other-prod-user",
      recordingId: "recording-other",
      songId: "song-other",
    }),
  ];
  snapshot.releaseGroups = [
    document("release-group-selected", { title: "Selected Release" }),
    document("release-group-other", { title: "Other Release" }),
  ];
  snapshot.youtubeItems = [
    document("youtube-selected", { videoId: "selected-video" }),
    document("youtube-other", { videoId: "other-video" }),
  ];
  snapshot.songArtistCredits = [
    document("song-credit-selected", {
      songId: "song-selected",
      artistId: "artist-songwriter",
    }),
    document("song-credit-other", {
      songId: "song-other",
      artistId: "artist-other",
    }),
  ];
  snapshot.recordingArtistCredits = [
    document("recording-credit-selected", {
      recordingId: "recording-selected",
      artistId: "artist-performer",
    }),
    document("recording-credit-other", {
      recordingId: "recording-other",
      artistId: "artist-other",
    }),
  ];
  snapshot.recordingPersonnel = [
    document("personnel-selected", {
      recordingId: "recording-selected",
      artistId: "artist-personnel",
    }),
    document("personnel-other", {
      recordingId: "recording-other",
      artistId: "artist-other",
    }),
  ];
  snapshot.recordingArtistAttributions = [
    document("attribution-selected", {
      recordingId: "recording-selected",
      artistId: "artist-performer",
    }),
    document("attribution-other", {
      recordingId: "recording-other",
      artistId: "artist-other",
    }),
  ];
  snapshot.releaseGroupArtistAttributions = [
    document("release-attribution-selected", {
      releaseGroupId: "release-group-selected",
      artistId: "artist-release",
    }),
    document("release-attribution-other", {
      releaseGroupId: "release-group-other",
      artistId: "artist-other",
    }),
  ];
  snapshot.artistMembershipLookups = [
    document("lookup-selected", { artistId: "artist-songwriter" }),
    document("lookup-private", { artistId: "artist-private" }),
    document("lookup-other", { artistId: "artist-other" }),
  ];
  snapshot.recordingYoutubeItems = [
    document("recording-youtube-selected", {
      recordingId: "recording-selected",
      songId: "song-selected",
      youtubeItemId: "youtube-selected",
    }),
    document("recording-youtube-other", {
      recordingId: "recording-other",
      songId: "song-other",
      youtubeItemId: "youtube-other",
    }),
  ];
  return snapshot;
};

test("JSONL parsing and serialization preserve Convex system fields", () => {
  const input = `${JSON.stringify(document("song-1", { name: "Round Midnight" }))}\n\n`;
  const parsed = parseDocumentsJsonl(input, "songs");
  assert.deepEqual(parsed, [document("song-1", { name: "Round Midnight" })]);
  assert.equal(documentsToJsonLines(parsed), `${input.trim()}\n`);
  assert.equal(documentsToJsonLines([]), "");
});

test("data-pull child failures retain redacted CLI diagnostics", () => {
  const secret = "prod:warmhearted-dog-849|secret-value";
  const message = formatDataPullChildFailure(
    "Production snapshot export",
    {
      code: 1,
      stderr: `Error using ${secret}: permission denied`,
    },
    [secret],
  );

  assert.match(message, /Production snapshot export failed \(1\)/);
  assert.match(message, /permission denied/);
  assert.doesNotMatch(message, /secret-value/);
});

test("filtered local import archives include every application table", () => {
  assert.deepEqual(
    dataPullImportArchiveEntries(APPLICATION_TABLES),
    APPLICATION_TABLES.map((table) => `${table}/documents.jsonl`),
  );
});

test("local clear seeds avoid incoming IDs owned by another table", () => {
  const local = emptySnapshot();
  local.songs = [
    document("incoming-release-id", { name: "Old song" }),
    document("safe-song-id", { name: "Another old song" }),
  ];
  local.releaseGroups = [document("safe-release-id", { title: "Old release" })];
  const incoming = emptySnapshot();
  incoming.releaseGroups = [document("incoming-release-id", { title: "New release" })];

  const seeds = selectLocalClearSeeds(
    ["songs", "releaseGroups"],
    local,
    incoming,
  );

  assert.equal(seeds.get("songs")?._id, "safe-song-id");
  assert.equal(seeds.get("releaseGroups")?._id, "safe-release-id");
});

test("production pull includes the selected user's complete app closure", () => {
  const local = emptySnapshot();
  local.users = [
    document("local-user", {
      clerkSubject: "user_local_dev",
      role: "user",
      email: "agent@example.invalid",
    }),
    document("local-admin", { clerkSubject: "user_local_admin", role: "admin" }),
  ];

  const result = filterProductionSnapshot(productionSnapshot(), local, {
    productionClerkSubject: "user_production_owner",
    localClerkSubject: "user_local_dev",
  });

  assert.equal(result.productionUserId, "prod-user");
  assert.equal(result.importedUserId, "prod-user");
  assert.deepEqual(result.tables.users.map((item) => item._id), ["prod-user"]);
  assert.deepEqual(result.tables.songs.map((item) => item._id).sort(), ["song-selected"]);
  assert.deepEqual(
    result.tables.recordings.map((item) => item._id).sort(),
    ["recording-also-on-song", "recording-selected"],
  );
  assert.deepEqual(
    result.tables.artists.map((item) => item._id).sort(),
    [
      "artist-performer",
      "artist-personnel",
      "artist-private",
      "artist-release",
      "artist-songwriter",
    ],
  );
  assert.deepEqual(result.tables.releaseGroups.map((item) => item._id), ["release-group-selected"]);
  assert.deepEqual(result.tables.youtubeItems.map((item) => item._id), ["youtube-selected"]);
  assert.equal(result.tables.songUserData[0]?.userId, "prod-user");
  assert.equal(result.tables.artistUserData[0]?.userId, "prod-user");
  assert.equal(result.tables.userRecordingData[0]?.userId, "prod-user");
  assert.equal(result.tables.users[0]?._creationTime, 1);
  assert.equal(result.counts.recordingYoutubeItems, 1);
  assert.equal(result.tables.songUserData.some((item) => item._id === "private-song-other"), false);
  assert.equal(result.tables.artists.some((item) => item._id === "artist-other"), false);
  for (const table of APPLICATION_TABLES) {
    assert.equal(result.counts[table], result.tables[table].length);
  }
});

test("pull rejects ambiguous users and broken selected references", () => {
  const local = emptySnapshot();
  local.users = [document("local-user", { clerkSubject: "user_local_dev", role: "user" })];
  assert.throws(
    () =>
      filterProductionSnapshot(productionSnapshot(), local, {
        productionClerkSubject: "user_missing",
        localClerkSubject: "user_local_dev",
      }),
    /No production User matched clerkSubject user_missing/,
  );

  const broken = productionSnapshot();
  broken.songUserData = [
    document("private-song-broken", {
      userId: "prod-user",
      songId: "song-does-not-exist",
    }),
  ];
  assert.throws(
    () =>
      filterProductionSnapshot(broken, local, {
        productionClerkSubject: "user_production_owner",
        localClerkSubject: "user_local_dev",
      }),
    /Missing songs reference/,
  );
});


test("pull keeps User IDs in the production namespace while using only development identity fields", () => {
  const production = productionSnapshot();
  production.users[0].email = "production@example.invalid";
  production.users[0].role = "admin";
  const local = emptySnapshot();
  local.users = [document("local-user", {
    clerkSubject: "user_local_dev", role: "user", email: "dev@example.invalid",
  })];
  const result = filterProductionSnapshot(production, local, {
    productionClerkSubject: "user_production_owner", localClerkSubject: "user_local_dev",
  });
  assert.equal(result.tables.users[0]._id, production.users[0]._id,
    "Mixing development User IDs with production IDs can assign users and recordings the same table number");
  assert.equal(result.tables.users[0].clerkSubject, "user_local_dev");
  assert.equal(result.tables.users[0].role, "user");
  assert.equal(result.tables.users[0].email, "dev@example.invalid");
  for (const table of ["songUserData", "artistUserData", "userRecordingData"] as const) {
    assert.ok(result.tables[table].every(row => row.userId === result.tables.users[0]._id));
  }
  assert.equal(local.users[0]._id, "local-user");
});
