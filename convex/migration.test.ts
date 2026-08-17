/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const identity = {
  subject: "owner",
  tokenIdentifier: "https://clerk.example.test|owner",
  issuer: "https://clerk.example.test",
  email: "owner@example.test",
};

test("imports an owner graph idempotently and preserves private ownership", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity);
  await owner.mutation(api.users.ensureCurrent, {});
  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await t.mutation(internal.migration.bindOwner, {
    legacyUserId: "legacy-owner",
  });

  const importGraph = async () => {
    await t.mutation(internal.migration.importArtists, {
      rows: [
        {
          id: "legacy-artist",
          name: "Example Artist",
          kind: "person",
          musicbrainz_artist_id: null,
          wikidata_id: null,
          image_url: null,
          image_source_url: null,
          image_license: null,
          image_lookup_completed_at: null,
        },
      ],
    });
    await t.mutation(internal.migration.importSongs, {
      rows: [
        {
          id: "legacy-song",
          name: "Example Song",
          year: 1930,
          wikipedia_extract: null,
          wikipedia_url: null,
          musicbrainz_work_id: null,
          work_date_start: null,
          work_date_end: null,
          is_discoverable: true,
          first_discoverable_at: "2026-08-17T00:00:00.000Z",
        },
      ],
    });
    await t.mutation(internal.migration.importReleaseGroups, {
      rows: [
        {
          id: "legacy-release-group",
          title: "Example Album",
          musicbrainz_release_group_id: "mb-release-group",
        },
      ],
    });
    await t.mutation(internal.migration.importYoutubeItems, {
      rows: [
        {
          video_id: "abcdefghijk",
          title: "Example Recording",
          channel_name: "Example Artist - Topic",
          search_category: "song",
          discovery_sources: ["legacy_recording_url"],
          ytmusic_artist_id: null,
          ytmusic_artist_name: null,
          ytmusic_album_id: null,
          ytmusic_album_name: null,
          duration_seconds: null,
          metadata_fetched_at: null,
        },
      ],
    });
    await t.mutation(internal.migration.importSongArtistCredits, {
      rows: [
        {
          id: "legacy-song-credit",
          song_id: "legacy-song",
          artist_id: "legacy-artist",
          role: "composer",
          credited_as: "Example Artist",
          sort_order: 0,
        },
      ],
    });
    await t.mutation(internal.migration.importRecordings, {
      rows: [
        {
          id: "legacy-recording",
          song_id: "legacy-song",
          name: "Example Recording",
          kind: null,
          artist: "Example Artist",
          year: null,
          album: "Example Album",
          duration: null,
          musicbrainz_recording_id: null,
          musicbrainz_release_id: null,
          recording_date_start: null,
          recording_date_end: null,
          recording_location: null,
          release_group_id: "legacy-release-group",
        },
      ],
    });
    await t.mutation(internal.migration.importRecordingArtistCredits, {
      rows: [
        {
          id: "legacy-recording-credit",
          recording_id: "legacy-recording",
          artist_id: "legacy-artist",
          role: "performer",
          credited_as: "Example Artist",
          sort_order: 0,
        },
      ],
    });
    await t.mutation(internal.migration.importRecordingYoutubeItems, {
      rows: [
        {
          recording_id: "legacy-recording",
          youtube_video_id: "abcdefghijk",
          created_at: "2026-08-17T00:00:00.000Z",
        },
      ],
    });
    await t.mutation(internal.migration.importSongUserData, {
      legacyOwnerId: "legacy-owner",
      rows: [
        {
          user_id: "legacy-owner",
          song_id: "legacy-song",
          notes: "Private Song note",
          display_title: null,
          favorite: true,
          tags: ["Standard"],
          created_at: "2026-08-17T00:00:00.000Z",
        },
      ],
    });
    await t.mutation(internal.migration.importUserRecordingData, {
      legacyOwnerId: "legacy-owner",
      rows: [
        {
          user_id: "legacy-owner",
          recording_id: "legacy-recording",
          notes: "Private Recording note",
          rating: 5,
          sort_order: 0,
          tags: null,
          key: "F",
          tempo: "120",
          created_at: "2026-08-17T00:00:00.000Z",
        },
      ],
    });
  };

  await importGraph();
  await importGraph();

  await expect(
    t.mutation(internal.migration.importSongUserData, {
      legacyOwnerId: "legacy-owner",
      rows: [
        {
          user_id: "another-user",
          song_id: "legacy-song",
          notes: null,
          display_title: null,
          favorite: false,
          tags: null,
          created_at: "2026-08-17T00:00:00.000Z",
        },
      ],
    }),
  ).rejects.toThrow("non-owner row");

  await expect(
    t.query(internal.migration.verifyOwnerSnapshot, {
      legacyOwnerId: "legacy-owner",
    }),
  ).resolves.toEqual({
    artists: 1,
    artistUserData: 0,
    recordingArtistCredits: 1,
    recordings: 1,
    recordingYoutubeItems: 1,
    releaseGroups: 1,
    songArtistCredits: 1,
    songs: 1,
    songUserData: 1,
    userRecordingData: 1,
    youtubeItems: 1,
  });

  const songs = await owner.query(api.songs.listMine, {});
  expect(songs).toEqual([
    expect.objectContaining({
      name: "Example Song",
      user_data: expect.objectContaining({ notes: "Private Song note" }),
    }),
  ]);
  const recordings = await owner.query(api.recordings.listMine, {
    songId: songs[0].id,
  });
  expect(recordings).toEqual([
    expect.objectContaining({
      kind: "video_capture",
      user_data: expect.objectContaining({
        notes: "Private Recording note",
        rating: 5,
      }),
    }),
  ]);
});
