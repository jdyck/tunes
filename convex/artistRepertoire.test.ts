/// <reference types="vite/client" />

import { runToCompletion } from "@convex-dev/migrations";
import migrationsComponent from "@convex-dev/migrations/test";
import { convexTest, type TestConvexForDataModel } from "convex-test";
import type { FunctionReturnType } from "convex/server";
import { expect, test, vi } from "vitest";
import { api, components, internal } from "./_generated/api";
import type { DataModel, Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
type TestClient = TestConvexForDataModel<DataModel>;

const identity = (subject: string) => ({
  subject,
  tokenIdentifier: `https://clerk.example.test|${subject}`,
  issuer: "https://clerk.example.test",
  email: `${subject}@example.test`,
});

const songInput = (name: string) => ({
  name,
  year: 1930,
  wikipediaExtract: null,
  wikipediaUrl: null,
  musicbrainzWorkId: null,
  workDateStart: null,
  workDateEnd: null,
});

const writer = (name: string, musicbrainzArtistId: string) => ({
  artistId: null,
  canonicalName: name,
  creditedAs: name,
  role: "composer" as const,
  artistKind: "person" as const,
  musicbrainzArtistId,
});

const youtubeInput = (songId: Id<"songs">, videoId: string) => ({
  songId,
  videoId,
  title: `Recording ${videoId}`,
  channelName: "Example Artist - Topic",
  searchCategory: "song" as const,
  discoverySource: "ytmusic_search" as const,
  recordingKind: "released" as const,
  ytmusicArtistId: null,
  ytmusicArtistName: "Example Artist",
  ytmusicAlbumId: null,
  ytmusicAlbumName: null,
  durationSeconds: 185,
  metadataFetchedAt: "2026-09-12T00:00:00.000Z",
});

const recordingUpdate = (
  recordingId: Id<"recordings">,
  releaseArtist: string,
  releaseArtistMbid: string,
) => ({
  recordingId,
  shared: {
    name: `Recording by ${releaseArtist}`,
    kind: "released" as const,
    artist: releaseArtist,
    album: "Shared album",
    year: "1958",
    duration: "3:05",
    musicbrainz_recording_id: null,
    musicbrainz_release_id: null,
    recording_date_start: "1958",
    recording_date_end: null,
    recording_location: null,
    release_group: {
      title: "Shared album",
      musicbrainz_release_group_id: "shared-release-group",
      attribution: [
        {
          type: "musicbrainz" as const,
          name: releaseArtist,
          credited_as: releaseArtist,
          join_phrase: "",
          kind: "person" as const,
          musicbrainz_artist_id: releaseArtistMbid,
        },
      ],
    },
    attribution: [],
    personnel: [],
  },
  privateData: {
    key: null,
    tempo: null,
    notes: null,
    rating: null,
    sort_order: null,
    tags: [],
  },
});

const listArtists = async (client: TestClient) => {
  const artists: FunctionReturnType<typeof api.artists.listMine>["page"] = [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.artists.listMine> =
      await client.query(api.artists.listMine, {
        paginationOpts: { cursor, numItems: 50 },
      });
    artists.push(...result.page);
    if (result.isDone) return artists;
    cursor = result.continueCursor;
  } while (cursor);
  return artists;
};

const listArtistSongs = async (client: TestClient, artistId: Id<"artists">) => {
  const songs: FunctionReturnType<typeof api.artists.listSongsMine>["page"] =
    [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.artists.listSongsMine> =
      await client.query(api.artists.listSongsMine, {
        artistId,
        paginationOpts: { cursor, numItems: 25 },
      });
    songs.push(...result.page);
    if (result.isDone) return songs;
    cursor = result.continueCursor;
  } while (cursor);
  return songs;
};

const listArtistRecordings = async (
  client: TestClient,
  artistId: Id<"artists">,
) => {
  const recordings: FunctionReturnType<
    typeof api.artists.listRecordingsMine
  >["page"] = [];
  let cursor: string | null = null;
  do {
    const result: FunctionReturnType<typeof api.artists.listRecordingsMine> =
      await client.query(api.artists.listRecordingsMine, {
        artistId,
        paginationOpts: { cursor, numItems: 25 },
      });
    recordings.push(...result.page);
    if (result.isDone) return recordings;
    cursor = result.continueCursor;
  } while (cursor);
  return recordings;
};

const drainScheduledWork = async (t: ReturnType<typeof convexTest>) => {
  vi.useFakeTimers();
  try {
    await t.finishAllScheduledFunctions(vi.runAllTimers, 200);
  } finally {
    vi.useRealTimers();
  }
};

test("requires authentication for paginated Artist repertoire entries", async () => {
  const t = convexTest({ schema, modules });
  const artistId = await t.run((ctx) =>
    ctx.db.insert("artists", {
      name: "Private Repertoire Artist",
      kind: "person",
      musicbrainzArtistId: null,
    }),
  );
  await expect(
    t.query(api.artists.listSongsMine, {
      artistId,
      paginationOpts: { cursor: null, numItems: 25 },
    }),
  ).rejects.toThrow("Unauthenticated");
  await expect(
    t.query(api.artists.listRecordingsMine, {
      artistId,
      paginationOpts: { cursor: null, numItems: 25 },
    }),
  ).rejects.toThrow("Unauthenticated");
});

test("browses and cursor-pages beyond 500 owned Songs and saved Recordings without leaking another User", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("capacity-owner"));
  const other = t.withIdentity(identity("capacity-other"));
  const ownerId = await owner.mutation(api.users.ensureCurrent, {});
  const otherId = await other.mutation(api.users.ensureCurrent, {});
  const artistId = await t.run((ctx) =>
    ctx.db.insert("artists", {
      name: "Capacity Artist",
      kind: "person",
      musicbrainzArtistId: "mb-capacity-artist",
    }),
  );

  for (let batchStart = 0; batchStart < 501; batchStart += 25) {
    const batchEnd = Math.min(batchStart + 25, 501);
    await t.run(async (ctx) => {
      for (let index = batchStart; index < batchEnd; index += 1) {
        const songId = await ctx.db.insert("songs", {
          name: `Capacity Song ${index}`,
          year: null,
          wikipediaExtract: null,
          wikipediaUrl: null,
          musicbrainzWorkId: null,
          workDateStart: null,
          workDateEnd: null,
          isDiscoverable: false,
          firstDiscoverableAt: null,
        });
        await ctx.db.insert("songArtistCredits", {
          songId,
          artistId,
          role: "composer",
          creditedAs: "Capacity Artist",
          sortOrder: 0,
        });
        await ctx.db.insert("songUserData", {
          userId: ownerId,
          songId,
          notes: null,
          displayTitle: null,
          favorite: false,
          tags: null,
          createdAt: "2026-09-12T00:00:00.000Z",
          creationRequestId: `capacity-${index}`,
        });
        await ctx.db.insert("artistSongRepertoireEntries", {
          userId: ownerId,
          artistId,
          songId,
        });
        const recordingId = await ctx.db.insert("recordings", {
          songId,
          name: `Capacity Recording ${index}`,
          kind: "released",
          artist: null,
          year: null,
          album: null,
          duration: null,
          musicbrainzRecordingId: null,
          musicbrainzReleaseId: null,
          recordingDateStart: null,
          recordingDateEnd: null,
          recordingLocation: null,
          releaseGroupId: null,
          personnelMigrated: true,
        });
        await ctx.db.insert("recordingArtistAttributions", {
          recordingId,
          artistId,
          creditedAs: "Capacity Artist",
          joinPhrase: "",
          sortOrder: 0,
        });
        await ctx.db.insert("userRecordingData", {
          userId: ownerId,
          recordingId,
          songId,
          notes: null,
          rating: null,
          sortOrder: 0,
          tags: null,
          key: null,
          tempo: null,
          createdAt: "2026-09-12T00:00:00.000Z",
        });
        await ctx.db.insert("artistRecordingRepertoireEntries", {
          userId: ownerId,
          artistId,
          recordingId,
          songId,
          relationshipReasons: ["attribution"],
        });
      }
    });
  }
  await t.run(async (ctx) => {
    await ctx.db.insert("artistRepertoireSummaries", {
      userId: ownerId,
      artistId,
      songCount: 501,
      recordingCount: 501,
    });
    const songId = await ctx.db.insert("songs", {
      name: "Other User Song",
      year: null,
      wikipediaExtract: null,
      wikipediaUrl: null,
      musicbrainzWorkId: null,
      workDateStart: null,
      workDateEnd: null,
      isDiscoverable: false,
      firstDiscoverableAt: null,
    });
    await ctx.db.insert("songArtistCredits", {
      songId,
      artistId,
      role: "composer",
      creditedAs: "Capacity Artist",
      sortOrder: 0,
    });
    await ctx.db.insert("songUserData", {
      userId: otherId,
      songId,
      notes: "Other only",
      displayTitle: null,
      favorite: false,
      tags: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      creationRequestId: "other-capacity-song",
    });
    await ctx.db.insert("artistSongRepertoireEntries", {
      userId: otherId,
      artistId,
      songId,
    });
    await ctx.db.insert("artistRepertoireSummaries", {
      userId: otherId,
      artistId,
      songCount: 1,
      recordingCount: 0,
    });
  });

  await expect(listArtists(owner)).resolves.toEqual([
    expect.objectContaining({
      id: artistId,
      songCount: 501,
      recordingCount: 501,
    }),
  ]);
  await expect(listArtists(other)).resolves.toEqual([
    expect.objectContaining({ songCount: 1, recordingCount: 0 }),
  ]);
  const detail = await owner.query(api.artists.getMine, { artistId });
  const firstSongPage = await owner.query(api.artists.listSongsMine, {
    artistId,
    paginationOpts: { cursor: null, numItems: 25 },
  });
  const firstRecordingPage = await owner.query(api.artists.listRecordingsMine, {
    artistId,
    paginationOpts: { cursor: null, numItems: 25 },
  });
  expect(detail).toMatchObject({ song_count: 501, recording_count: 501 });
  expect(firstSongPage.page).toHaveLength(25);
  expect(firstSongPage.isDone).toBe(false);
  expect(firstRecordingPage.page).toHaveLength(25);
  expect(firstRecordingPage.isDone).toBe(false);
  const songs = await listArtistSongs(owner, artistId);
  const recordings = await listArtistRecordings(owner, artistId);
  expect(songs).toHaveLength(501);
  expect(new Set(songs.map((song) => song.id)).size).toBe(501);
  expect(recordings).toHaveLength(501);
  expect(new Set(recordings.map((recording) => recording.id)).size).toBe(501);
});

test("unsaving removes the Recording entry and its last summary immediately", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("unsave-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "unsave-song",
    shared: songInput("Unsave Song"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "zyxwvutsrqp"),
  );
  await owner.mutation(
    api.recordings.update,
    recordingUpdate(recordingId, "Unsave Artist", "mb-unsave-artist"),
  );
  expect(await listArtists(owner)).toEqual([
    expect.objectContaining({ recordingCount: 1 }),
  ]);

  await owner.mutation(api.recordings.unsave, { recordingId });
  await expect(listArtists(owner)).resolves.toEqual([]);
  await drainScheduledWork(t);
  await expect(listArtists(owner)).resolves.toEqual([]);
});

test("reconciles a shared Song writer change across multiple bounded continuation batches", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("writer-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "writer-fanout",
    shared: songInput("Shared Song"),
    writers: [writer("First Writer", "mb-first-writer")],
  });
  await t.mutation(internal.users.setRole, {
    clerkSubject: "writer-owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  const others = Array.from({ length: 18 }, (_, index) =>
    t.withIdentity(identity(`writer-other-${index}`)),
  );
  for (const other of others) {
    await other.mutation(api.users.ensureCurrent, {});
    await other.mutation(api.songs.addDiscoverable, { songId });
  }

  await owner.mutation(api.songs.update, {
    songId,
    privateData: {
      notes: null,
      displayTitle: null,
      favorite: false,
      tags: null,
    },
    shared: songInput("Shared Song"),
    writers: [writer("Second Writer", "mb-second-writer")],
  });
  expect((await listArtists(owner))[0]?.name).toBe("Second Writer");
  expect((await listArtists(others[0]!))[0]?.name).toBe("First Writer");

  await drainScheduledWork(t);
  for (const other of others) {
    await expect(listArtists(other)).resolves.toEqual([
      expect.objectContaining({
        name: "Second Writer",
        songCount: 1,
        recordingCount: 0,
      }),
    ]);
  }
  await expect(
    t.run((ctx) => ctx.db.query("artistRepertoireReconciliationJobs").take(1)),
  ).resolves.toEqual([]);

  await owner.mutation(api.songs.update, {
    songId,
    privateData: {
      notes: null,
      displayTitle: null,
      favorite: false,
      tags: null,
    },
    shared: songInput("Shared Song"),
    writers: [writer("Second Writer", "mb-second-writer")],
  });
  await drainScheduledWork(t);
  await expect(listArtists(others[0]!)).resolves.toEqual([
    expect.objectContaining({ songCount: 1, recordingCount: 0 }),
  ]);
});

test("fans out a Release Group attribution replacement to every saved Recording", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("release-owner"));
  const other = t.withIdentity(identity("release-other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "release-fanout",
    shared: songInput("Shared Recording Song"),
    writers: [],
  });
  const firstRecordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const secondRecordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "lmnopqrstuv"),
  );
  await owner.mutation(
    api.recordings.update,
    recordingUpdate(firstRecordingId, "First Album Artist", "mb-first-album"),
  );
  await owner.mutation(
    api.recordings.update,
    recordingUpdate(secondRecordingId, "First Album Artist", "mb-first-album"),
  );
  await t.mutation(internal.users.setRole, {
    clerkSubject: "release-owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });
  await other.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  await other.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "lmnopqrstuv"),
  );
  await drainScheduledWork(t);
  expect((await listArtists(other))[0]?.recordingCount).toBe(2);

  await owner.mutation(
    api.recordings.update,
    recordingUpdate(firstRecordingId, "Second Album Artist", "mb-second-album"),
  );
  expect((await listArtists(other))[0]?.name).toBe("First Album Artist");
  await drainScheduledWork(t);
  await expect(listArtists(other)).resolves.toEqual([
    expect.objectContaining({
      name: "Second Album Artist",
      songCount: 0,
      recordingCount: 2,
    }),
  ]);
});

test("backfills idempotently and the verification pass detects summary corruption", async () => {
  const t = convexTest({ schema, modules });
  migrationsComponent.register(t);
  const owner = t.withIdentity(identity("projection-migration-owner"));
  const ownerId = await owner.mutation(api.users.ensureCurrent, {});
  const { artistId } = await t.run(async (ctx) => {
    await ctx.db.patch(ownerId, { artistRepertoireProjectedAt: undefined });
    const artistId = await ctx.db.insert("artists", {
      name: "Backfill Artist",
      kind: "person",
      musicbrainzArtistId: "mb-backfill-artist",
    });
    const songId = await ctx.db.insert("songs", {
      name: "Backfill Song",
      year: null,
      wikipediaExtract: null,
      wikipediaUrl: null,
      musicbrainzWorkId: null,
      workDateStart: null,
      workDateEnd: null,
      isDiscoverable: false,
      firstDiscoverableAt: null,
    });
    await ctx.db.insert("songArtistCredits", {
      songId,
      artistId,
      role: "composer",
      creditedAs: "Backfill Artist",
      sortOrder: 0,
    });
    await ctx.db.insert("songUserData", {
      userId: ownerId,
      songId,
      notes: null,
      displayTitle: null,
      favorite: false,
      tags: null,
      createdAt: "2026-09-12T00:00:00.000Z",
      creationRequestId: "backfill-song",
    });
    const recordingId = await ctx.db.insert("recordings", {
      songId,
      name: "Backfill Recording",
      kind: "released",
      artist: null,
      year: null,
      album: null,
      duration: null,
      musicbrainzRecordingId: null,
      musicbrainzReleaseId: null,
      recordingDateStart: null,
      recordingDateEnd: null,
      recordingLocation: null,
      releaseGroupId: null,
      personnelMigrated: true,
    });
    await ctx.db.insert("recordingArtistAttributions", {
      recordingId,
      artistId,
      creditedAs: "Backfill Artist",
      joinPhrase: "",
      sortOrder: 0,
    });
    await ctx.db.insert("userRecordingData", {
      userId: ownerId,
      recordingId,
      songId,
      notes: null,
      rating: null,
      sortOrder: 0,
      tags: null,
      key: null,
      tempo: null,
      createdAt: "2026-09-12T00:00:00.000Z",
    });
    return { artistId };
  });

  await expect(listArtists(owner)).resolves.toEqual([
    expect.objectContaining({ songCount: 1, recordingCount: 1 }),
  ]);

  await t.run(async (ctx) => {
    for (const [migration, name] of [
      [internal.migrations.backfillArtistSongRepertoire, "song-backfill"],
      [
        internal.migrations.backfillArtistRecordingRepertoire,
        "recording-backfill",
      ],
      [internal.migrations.backfillArtistSongRepertoire, "song-backfill-retry"],
      [
        internal.migrations.backfillArtistRecordingRepertoire,
        "recording-backfill-retry",
      ],
    ] as const) {
      await runToCompletion(ctx, components.migrations, migration, {
        cursor: null,
        name,
      });
    }
    for (const migration of [
      internal.migrations.verifyArtistSongRepertoireSources,
      internal.migrations.verifyArtistRecordingRepertoireSources,
      internal.migrations.verifyArtistSongRepertoireEntries,
      internal.migrations.verifyArtistRecordingRepertoireEntries,
      internal.migrations.verifyArtistRepertoireSummaries,
      internal.migrations.activateArtistRepertoireProjection,
    ]) {
      await runToCompletion(ctx, components.migrations, migration, {
        cursor: null,
      });
    }
  });
  await expect(listArtists(owner)).resolves.toEqual([
    expect.objectContaining({ songCount: 1, recordingCount: 1 }),
  ]);
  await expect(t.run((ctx) => ctx.db.get(ownerId))).resolves.toMatchObject({
    artistRepertoireProjectedAt: expect.any(String),
  });

  await t.run(async (ctx) => {
    const summary = await ctx.db
      .query("artistRepertoireSummaries")
      .withIndex("by_userId_and_artistId", (query) =>
        query.eq("userId", ownerId).eq("artistId", artistId),
      )
      .unique();
    if (!summary) throw new Error("Expected Artist repertoire summary");
    await ctx.db.patch(summary._id, { songCount: 2 });
  });
  await expect(
    t.run((ctx) =>
      runToCompletion(
        ctx,
        components.migrations,
        internal.migrations.verifyArtistRepertoireSummaries,
        { cursor: null, name: "verify-corruption" },
      ),
    ),
  ).rejects.toThrow("summary counts do not match");
});
