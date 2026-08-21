/// <reference types="vite/client" />

import { runToCompletion } from "@convex-dev/migrations";
import migrationsComponent from "@convex-dev/migrations/test";
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

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
  metadataFetchedAt: "2026-08-21T00:00:00.000Z",
});

test("backfills grouped generic Personnel, verifies it, and is safe to rerun", async () => {
  const t = convexTest({ schema, modules });
  migrationsComponent.register(t);
  const owner = t.withIdentity(identity("migration-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "migration-song",
    shared: songInput("Detour Ahead"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );

  await t.run(async (ctx) => {
    const firstArtistId = await ctx.db.insert("artists", {
      name: "Bill Evans",
      kind: "person",
      musicbrainzArtistId: "mb-bill-evans",
      legacySupabaseId: null,
    });
    const secondArtistId = await ctx.db.insert("artists", {
      name: "Scott LaFaro",
      kind: "person",
      musicbrainzArtistId: "mb-scott-lafaro",
      legacySupabaseId: null,
    });
    for (const [artistId, creditedAs, sortOrder] of [
      [firstArtistId, "Bill Evans", 0],
      [firstArtistId, "Evans, Bill", 1],
      [secondArtistId, "Scott LaFaro", 2],
    ] as const) {
      await ctx.db.insert("recordingArtistCredits", {
        recordingId,
        artistId,
        role: "performer",
        creditedAs,
        sortOrder,
        legacySupabaseId: null,
      });
    }
    const recording = await ctx.db.get(recordingId);
    if (!recording) throw new Error("Expected Recording");
    const {
      personnelMigrated: _migrated,
      personnelMigrationKind: _kind,
      ...unmigrated
    } = recording;
    await ctx.db.replace(recordingId, unmigrated);
  });

  await t.run(async (ctx) => {
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRecordingPersonnel,
      { cursor: null },
    );
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.verifyRecordingPersonnel,
      { cursor: null },
    );
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRecordingPersonnel,
      {
        cursor: null,
        name: "migrations:backfillRecordingPersonnelRerun",
      },
    );
  });

  const state = await t.run(async (ctx) => {
    const recording = await ctx.db.get(recordingId);
    const personnel = await ctx.db
      .query("recordingPersonnel")
      .withIndex("by_recordingId_and_sortOrder", (query) =>
        query.eq("recordingId", recordingId),
      )
      .take(101);
    return { recording, personnel };
  });
  expect(state.recording).toMatchObject({
    personnelMigrated: true,
    personnelMigrationKind: "legacy_backfill",
  });
  expect(state.personnel).toMatchObject([
    {
      creditedAs: "Bill Evans",
      sortOrder: 0,
      relationships: [{ type: "performer", details: [] }],
    },
    {
      creditedAs: "Scott LaFaro",
      sortOrder: 1,
      relationships: [{ type: "performer", details: [] }],
    },
  ]);
  await expect(
    owner.query(api.recordings.getMine, { recordingId }),
  ).resolves.toMatchObject({
    personnel: [
      { credited_as: "Bill Evans" },
      { credited_as: "Scott LaFaro" },
    ],
  });
});

test("preserves an intentionally empty new Personnel set over legacy rows", async () => {
  const t = convexTest({ schema, modules });
  migrationsComponent.register(t);
  const owner = t.withIdentity(identity("migration-empty-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "migration-empty-song",
    shared: songInput("Spring Is Here"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "lmnopqrstuv"),
  );
  await t.run(async (ctx) => {
    const artistId = await ctx.db.insert("artists", {
      name: "Legacy Artist",
      kind: "person",
      musicbrainzArtistId: "mb-legacy-artist",
      legacySupabaseId: null,
    });
    await ctx.db.insert("recordingArtistCredits", {
      recordingId,
      artistId,
      role: "performer",
      creditedAs: "Legacy Artist",
      sortOrder: 0,
      legacySupabaseId: null,
    });
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.backfillRecordingPersonnel,
      { cursor: null },
    );
    await runToCompletion(
      ctx,
      components.migrations,
      internal.migrations.verifyRecordingPersonnel,
      { cursor: null },
    );
  });

  await expect(
    owner.query(api.recordings.getMine, { recordingId }),
  ).resolves.toMatchObject({ personnel: [] });
});

test("verification rejects a missing canonical Personnel Artist", async () => {
  const t = convexTest({ schema, modules });
  migrationsComponent.register(t);
  const owner = t.withIdentity(identity("migration-invalid-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "migration-invalid-song",
    shared: songInput("Some Other Time"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "zyxwvutsrqp"),
  );
  await t.run(async (ctx) => {
    const artistId = await ctx.db.insert("artists", {
      name: "Temporary Artist",
      kind: "person",
      musicbrainzArtistId: "mb-temporary-artist",
      legacySupabaseId: null,
    });
    await ctx.db.insert("recordingPersonnel", {
      recordingId,
      artistId,
      creditedAs: "Temporary Artist",
      sortOrder: 0,
      relationships: [{ type: "performer", details: [] }],
    });
    await ctx.db.delete(artistId);
  });

  await expect(
    t.run((ctx) =>
      runToCompletion(
        ctx,
        components.migrations,
        internal.migrations.verifyRecordingPersonnel,
        { cursor: null },
      ),
    ),
  ).rejects.toThrow("missing Artist");
});
