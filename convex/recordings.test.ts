/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import type { AttributionInput } from "./model/recordings";

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
  ytmusicArtistId: "artist-channel-id",
  ytmusicArtistName: "Example Artist",
  ytmusicAlbumId: "album-playlist-id",
  ytmusicAlbumName: "Example Album",
  durationSeconds: 185,
  metadataFetchedAt: "2026-08-17T00:00:00.000Z",
});

const updateInput = (
  recordingId: Id<"recordings">,
  name: string,
  notes: string | null,
) => ({
  recordingId,
  shared: {
    name,
    kind: "released" as const,
    artist: "Example Artist",
    album: "Example Album",
    year: "1958",
    duration: "3:05",
    musicbrainz_recording_id: "mb-recording-id",
    musicbrainz_release_id: "mb-release-id",
    recording_date_start: "1958-03",
    recording_date_end: null,
    recording_location: "New York",
    release_group: {
      title: "Example Album",
      musicbrainz_release_group_id: "mb-release-group-id",
    },
    attribution: [
      {
        type: "musicbrainz" as const,
        name: "Example Artist",
        credited_as: "Example Artist",
        join_phrase: "",
        kind: "person" as const,
        musicbrainz_artist_id: "mb-artist-id",
      },
    ] as AttributionInput[],
    performers: [
      {
        name: "Example Artist",
        credited_as: "Example Artist",
        kind: "person" as const,
        musicbrainz_artist_id: "mb-artist-id",
      },
    ],
  },
  privateData: {
    key: "F",
    tempo: "120",
    notes,
    rating: 4,
    sort_order: 0,
    tags: ["Practice"],
  },
});

test("requires authentication and Song membership to save a Recording", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  const other = t.withIdentity(identity("other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "recording-song-1",
    shared: songInput("All of Me"),
    writers: [],
  });

  await expect(
    t.mutation(api.recordings.saveYoutube, youtubeInput(songId, "abcdefghijk")),
  ).rejects.toThrow("Unauthenticated");
  await expect(
    other.mutation(
      api.recordings.saveYoutube,
      youtubeInput(songId, "abcdefghijk"),
    ),
  ).rejects.toThrow("Song not found in your list");
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  await expect(
    t.mutation(api.recordings.update, updateInput(recordingId, "All of Me", null)),
  ).rejects.toThrow("Unauthenticated");
  await expect(
    other.mutation(
      api.recordings.update,
      updateInput(recordingId, "All of Me", null),
    ),
  ).rejects.toThrow("Saved Recording not found");
});

test("reuses shared Recording identity while isolating each User's private data", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  const other = t.withIdentity(identity("other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "recording-song-2",
    shared: songInput("Stella by Starlight"),
    writers: [],
  });
  const firstRecordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const idempotentId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  expect(idempotentId).toBe(firstRecordingId);
  await expect(
    other.query(api.recordings.getMine, {
      recordingId: firstRecordingId,
    }),
  ).resolves.toBeNull();

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });
  const reusedRecordingId = await other.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  expect(reusedRecordingId).toBe(firstRecordingId);

  await other.mutation(
    api.recordings.update,
    updateInput(firstRecordingId, "Shared edited title", "Other's note"),
  );
  const ownerView = await owner.query(api.recordings.getMine, {
    recordingId: firstRecordingId,
  });
  const otherView = await other.query(api.recordings.getMine, {
    recordingId: firstRecordingId,
  });
  if (!ownerView || !otherView) {
    throw new Error("Expected both Users to have saved the Recording");
  }
  expect(ownerView.name).toBe("Shared edited title");
  expect(ownerView.user_data).toMatchObject({
    notes: null,
    rating: null,
    tags: null,
    key: null,
    tempo: null,
  });
  expect(otherView.user_data).toMatchObject({
    notes: "Other's note",
    rating: 4,
    tags: ["Practice"],
    key: "F",
    tempo: "120",
  });
  expect(otherView.release_groups?.title).toBe("Example Album");
  expect(otherView.recording_artist_credits).toHaveLength(1);
});

test("reorders and unsaves only the current User's private relationships", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "recording-song-3",
    shared: songInput("My Funny Valentine"),
    writers: [],
  });
  const firstId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const secondId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "lmnopqrstuv"),
  );

  await owner.mutation(api.recordings.reorder, {
    songId,
    recordingIds: [secondId, firstId],
  });
  const reordered = await owner.query(api.recordings.listMine, { songId });
  expect(reordered.map((recording) => recording.id)).toEqual([
    secondId,
    firstId,
  ]);
  const artwork = await owner.query(api.recordings.listArtworkMine, {});
  expect(artwork).toEqual([
    expect.objectContaining({
      song_id: songId,
      youtube_items: [{ video_id: "lmnopqrstuv" }],
    }),
  ]);

  await expect(
    owner.mutation(api.recordings.reorder, {
      songId,
      recordingIds: [firstId],
    }),
  ).rejects.toThrow("complete Song list");

  await owner.mutation(api.recordings.unsave, { recordingId: firstId });
  const afterUnsave = await owner.query(api.recordings.listMine, { songId });
  expect(afterUnsave.map((recording) => recording.id)).toEqual([secondId]);
  await expect(
    owner.query(api.recordings.getMine, { recordingId: firstId }),
  ).resolves.toBeNull();
});

test("replaces Recording Attribution atomically, preserving repeated Artist parts", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("attribution-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "recording-attribution-song",
    shared: songInput("A Fine Romance"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const input = updateInput(recordingId, "A Fine Romance", null);
  input.shared.attribution = [
    {
        type: "musicbrainz" as const,
        name: "Example Artist",
        credited_as: "Example Artist",
        join_phrase: " with ",
        kind: "person",
        musicbrainz_artist_id: "mb-artist-id",
      },
      {
        type: "musicbrainz" as const,
        name: "Example Artist",
        credited_as: "Example",
        join_phrase: "",
        kind: "person",
        musicbrainz_artist_id: "mb-artist-id",
    },
  ];
  await owner.mutation(api.recordings.update, input);

  const firstView = await owner.query(api.recordings.getMine, { recordingId });
  expect(firstView?.artist).toBe("Example Artist with Example");
  expect(firstView?.artist_attribution_fallback).toBe("Example Artist");
  expect(firstView?.recording_artist_attributions).toHaveLength(2);
  expect(firstView?.recording_artist_attributions[0]?.artist_id).toBe(
    firstView?.recording_artist_attributions[1]?.artist_id,
  );
  expect(firstView?.recording_artist_attributions[0]?.artist_id).toBe(
    firstView?.recording_artist_credits[0]?.artist_id,
  );

  input.shared.attribution = [
    {
      type: "musicbrainz" as const,
      name: "Louis Armstrong",
      credited_as: "Louis Armstrong",
      join_phrase: "",
      kind: "person",
      musicbrainz_artist_id: "mb-louis",
    },
  ];
  await owner.mutation(api.recordings.update, input);
  const replaced = await owner.query(api.recordings.getMine, { recordingId });
  expect(replaced?.recording_artist_attributions).toMatchObject([
    { credited_as: "Louis Armstrong", join_phrase: "" },
  ]);

  const unlinkInput = {
    ...input,
    shared: {
      ...input.shared,
      musicbrainz_recording_id: null,
      musicbrainz_release_id: null,
      release_group: null,
      performers: [],
    },
  };
  await owner.mutation(api.recordings.update, unlinkInput);
  const unlinked = await owner.query(api.recordings.getMine, { recordingId });
  expect(unlinked?.musicbrainz_recording_id).toBeNull();
  expect(unlinked?.recording_artist_credits).toEqual([]);
  expect(unlinked?.recording_artist_attributions).toMatchObject([
    { credited_as: "Louis Armstrong" },
  ]);

  const clearInput = {
    ...unlinkInput,
    shared: { ...unlinkInput.shared, attribution: [] },
  };
  await owner.mutation(api.recordings.update, clearInput);
  const cleared = await owner.query(api.recordings.getMine, { recordingId });
  expect(cleared?.recording_artist_attributions).toEqual([]);
  expect(cleared?.artist).toBe("Example Artist");
});

test("reuses selected Artists, creates provider-unmatched Artists explicitly, and rejects missing Artist IDs", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("manual-attribution-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "manual-attribution-song",
    shared: songInput("But Not for Me"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const input = updateInput(recordingId, "But Not for Me", null);
  input.shared.attribution = [
    {
      type: "provider_unmatched" as const,
      name: "Local Session Ensemble",
      credited_as: "The Ensemble",
      join_phrase: " featuring ",
      kind: "group",
    },
  ];
  await owner.mutation(api.recordings.update, input);

  const created = await owner.query(api.recordings.getMine, { recordingId });
  const localArtist = created?.recording_artist_attributions[0]?.artists;
  expect(localArtist).toMatchObject({
    name: "Local Session Ensemble",
    musicbrainz_artist_id: null,
  });
  if (!localArtist) throw new Error("Expected the manual Artist to be created");

  input.shared.attribution = [
    {
      type: "existing" as const,
      artist_id: localArtist.id,
      credited_as: "The Ensemble",
      join_phrase: " & ",
    },
    {
      type: "existing" as const,
      artist_id: localArtist.id,
      credited_as: "Ensemble",
      join_phrase: "",
    },
  ];
  await owner.mutation(api.recordings.update, input);
  const reused = await owner.query(api.recordings.getMine, { recordingId });
  expect(reused?.recording_artist_attributions).toMatchObject([
    { artist_id: localArtist.id, credited_as: "The Ensemble", join_phrase: " & " },
    { artist_id: localArtist.id, credited_as: "Ensemble", join_phrase: "" },
  ]);

  input.shared.attribution = [{
    type: "existing" as const,
    artist_id: songId.replace(/songs$/, "artists") as Id<"artists">,
    credited_as: "Missing",
    join_phrase: "",
  }];
  await expect(owner.mutation(api.recordings.update, input)).rejects.toThrow(
    "missing Artist",
  );
  const preserved = await owner.query(api.recordings.getMine, { recordingId });
  expect(preserved?.recording_artist_attributions).toMatchObject([
    { artist_id: localArtist.id, credited_as: "The Ensemble" },
    { artist_id: localArtist.id, credited_as: "Ensemble" },
  ]);
});

test("rejects an oversized Attribution before replacing stored parts", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("attribution-bounds"));
  await owner.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "recording-attribution-bounds",
    shared: songInput("I Get a Kick Out of You"),
    writers: [],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId, "abcdefghijk"),
  );
  const input = updateInput(recordingId, "I Get a Kick Out of You", null);
  await owner.mutation(api.recordings.update, input);

  input.shared.attribution = Array.from({ length: 101 }, (_, index) => ({
    type: "musicbrainz" as const,
    name: `Artist ${index}`,
    credited_as: `Artist ${index}`,
    join_phrase: "",
    kind: "person" as const,
    musicbrainz_artist_id: `mb-artist-${index}`,
  }));
  await expect(owner.mutation(api.recordings.update, input)).rejects.toThrow(
    "100 Attribution parts",
  );

  const afterRejectedSave = await owner.query(api.recordings.getMine, {
    recordingId,
  });
  expect(afterRejectedSave?.recording_artist_attributions).toMatchObject([
    { credited_as: "Example Artist" },
  ]);
});
