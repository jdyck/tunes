/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { api, internal } from "./_generated/api";
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

const youtubeInput = (songId: Id<"songs">) => ({
  songId,
  videoId: "abcdefghijk",
  title: "Example performance",
  channelName: "Sarah Vaughan - Topic",
  searchCategory: "song" as const,
  discoverySource: "ytmusic_search" as const,
  recordingKind: "released" as const,
  ytmusicArtistId: null,
  ytmusicArtistName: "Sarah Vaughan",
  ytmusicAlbumId: null,
  ytmusicAlbumName: null,
  durationSeconds: 185,
  metadataFetchedAt: "2026-08-17T00:00:00.000Z",
});

const recordingUpdateInput = (
  recordingId: Id<"recordings">,
  name: string,
  notes: string,
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
    release_group: null as {
      title: string;
      musicbrainz_release_group_id: string;
      attribution: {
        type: "musicbrainz";
        name: string;
        credited_as: string;
        join_phrase: string;
        kind: "person";
        musicbrainz_artist_id: string;
      }[];
    } | null,
    attribution: [],
    personnel: [],
  },
  privateData: {
    key: null,
    tempo: null,
    notes,
    rating: null,
    sort_order: null,
    tags: [],
  },
});

test("requires authentication for Artist browsing", async () => {
  const t = convexTest({ schema, modules });
  await expect(t.query(api.artists.listMine, {})).rejects.toThrow(
    "Unauthenticated",
  );
  await expect(t.query(api.artists.search, { query: "Ella" })).rejects.toThrow(
    "Unauthenticated",
  );
});

test("searches existing canonical Artists for authenticated Users", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("artist-search-owner"));
  await owner.mutation(api.users.ensureCurrent, {});
  await owner.mutation(api.songs.create, {
    requestId: "artist-search-song",
    shared: songInput("How High the Moon"),
    writers: [
      {
        artistId: null,
        canonicalName: "Ella Fitzgerald",
        creditedAs: "Ella Fitzgerald",
        role: "composer",
        artistKind: "person",
        musicbrainzArtistId: "mb-ella-fitzgerald",
      },
    ],
  });

  await expect(
    owner.query(api.artists.search, { query: "Ella" }),
  ).resolves.toEqual([
    expect.objectContaining({
      name: "Ella Fitzgerald",
      musicbrainz_artist_id: "mb-ella-fitzgerald",
    }),
  ]);
  await expect(
    owner.query(api.artists.search, { query: " " }),
  ).resolves.toEqual([]);
});

test("counts only the current User's Songs and saved Recordings", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  const other = t.withIdentity(identity("other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});

  const songId = await owner.mutation(api.songs.create, {
    requestId: "artist-song-1",
    shared: songInput("Lullaby of Birdland"),
    writers: [
      {
        artistId: null,
        canonicalName: "George Shearing",
        creditedAs: "George Shearing",
        role: "composer",
        artistKind: "person",
        musicbrainzArtistId: "mb-george-shearing",
      },
      {
        artistId: null,
        canonicalName: "George Shearing",
        creditedAs: "George Shearing",
        role: "writer",
        artistKind: "person",
        musicbrainzArtistId: "mb-george-shearing",
      },
    ],
  });
  const recordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId),
  );
  await owner.mutation(api.recordings.update, {
    recordingId,
    shared: {
      name: "Example performance",
      kind: "released",
      artist: "Sarah Vaughan",
      album: null,
      year: "1954",
      duration: "3:05",
      musicbrainz_recording_id: null,
      musicbrainz_release_id: null,
      recording_date_start: "1954",
      recording_date_end: null,
      recording_location: null,
      release_group: {
        title: "Ella and Louis",
        musicbrainz_release_group_id: "ella-and-louis",
        attribution: [
          {
            type: "musicbrainz" as const,
            name: "Ella Fitzgerald",
            credited_as: "Ella Fitzgerald",
            join_phrase: " & ",
            kind: "person" as const,
            musicbrainz_artist_id: "mb-ella-fitzgerald",
          },
          {
            type: "musicbrainz" as const,
            name: "Sarah Vaughan",
            credited_as: "Sarah Vaughan",
            join_phrase: "",
            kind: "person" as const,
            musicbrainz_artist_id: "mb-sarah-vaughan",
          },
        ],
      },
      attribution: [
        {
          type: "musicbrainz" as const,
          name: "Sarah Vaughan",
          credited_as: "Sarah Vaughan",
          join_phrase: "",
          kind: "person",
          musicbrainz_artist_id: "mb-sarah-vaughan",
        },
        {
          type: "musicbrainz" as const,
          name: "Carmen McRae",
          credited_as: "Carmen McRae",
          join_phrase: "",
          kind: "person",
          musicbrainz_artist_id: "mb-carmen-mcrae",
        },
      ],
      personnel: [
        {
          type: "musicbrainz" as const,
          name: "Sarah Vaughan",
          credited_as: "Sarah Vaughan",
          kind: "person",
          musicbrainz_artist_id: "mb-sarah-vaughan",
          relationships: [{ type: "performer" as const, details: [] }],
        },
      ],
    },
    privateData: {
      key: null,
      tempo: null,
      notes: "Owner only",
      rating: null,
      sort_order: 0,
      tags: [],
    },
  });

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });

  const ownerArtists = await owner.query(api.artists.listMine, {});
  expect(ownerArtists).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "George Shearing",
        songCount: 1,
        recordingCount: 0,
      }),
      expect.objectContaining({
        name: "Sarah Vaughan",
        songCount: 0,
        recordingCount: 1,
      }),
      expect.objectContaining({
        name: "Carmen McRae",
        songCount: 0,
        recordingCount: 1,
      }),
      expect.objectContaining({
        name: "Ella Fitzgerald",
        songCount: 0,
        recordingCount: 1,
      }),
    ]),
  );
  const otherArtists = await other.query(api.artists.listMine, {});
  expect(otherArtists).toEqual([
    expect.objectContaining({
      name: "George Shearing",
      songCount: 1,
      recordingCount: 0,
    }),
  ]);

  const performer = ownerArtists.find(
    (artist) => artist.name === "Sarah Vaughan",
  );
  if (!performer) throw new Error("Expected performer Artist");
  const ownerDetail = await owner.query(api.artists.getMine, {
    artistId: performer.id,
  });
  const otherDetail = await other.query(api.artists.getMine, {
    artistId: performer.id,
  });
  expect(ownerDetail?.recordings).toHaveLength(1);
  expect(ownerDetail?.recordings[0].user_data.notes).toBe("Owner only");
  expect(ownerDetail?.recordings[0].relationship_reasons).toEqual([
    "release_group_attribution",
    "attribution",
    "personnel",
  ]);
  expect(ownerDetail?.recording_song_titles).toEqual([
    { song_id: songId, title: "Lullaby of Birdland" },
  ]);
  expect(otherDetail?.recordings).toEqual([]);

  const attributionArtist = ownerArtists.find(
    (artist) => artist.name === "Carmen McRae",
  );
  if (!attributionArtist) throw new Error("Expected Attribution Artist");
  await expect(
    owner.query(api.artists.getMine, { artistId: attributionArtist.id }),
  ).resolves.toMatchObject({
    recordings: [
      {
        id: recordingId,
        relationship_reasons: ["attribution"],
        user_data: { notes: "Owner only" },
      },
    ],
  });
  await expect(
    other.query(api.artists.getMine, { artistId: attributionArtist.id }),
  ).resolves.toMatchObject({ recordings: [] });

  const releaseGroupArtist = ownerArtists.find(
    (artist) => artist.name === "Ella Fitzgerald",
  );
  if (!releaseGroupArtist)
    throw new Error("Expected Release Group Attribution Artist");
  await expect(
    owner.query(api.artists.getMine, { artistId: releaseGroupArtist.id }),
  ).resolves.toMatchObject({
    recordings: [
      {
        id: recordingId,
        release_groups: { title: "Ella and Louis" },
        relationship_reasons: ["release_group_attribution"],
        user_data: { notes: "Owner only" },
      },
    ],
  });
  await expect(
    other.query(api.artists.getMine, { artistId: releaseGroupArtist.id }),
  ).resolves.toMatchObject({ recordings: [] });
});

test("browses each User's saved Recordings through one shared Release Group", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("album-credit-owner"));
  const other = t.withIdentity(identity("album-credit-other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  const songId = await owner.mutation(api.songs.create, {
    requestId: "album-credit-song",
    shared: songInput("A Foggy Day"),
    writers: [],
  });
  const firstRecordingId = await owner.mutation(
    api.recordings.saveYoutube,
    youtubeInput(songId),
  );
  const secondRecordingId = await owner.mutation(api.recordings.saveYoutube, {
    ...youtubeInput(songId),
    videoId: "lmnopqrstuv",
  });
  const releaseGroupAttribution = [
    {
      type: "musicbrainz" as const,
      name: "Ella Fitzgerald",
      credited_as: "Ella Fitzgerald",
      join_phrase: "",
      kind: "person" as const,
      musicbrainz_artist_id: "mb-ella-fitzgerald",
    },
  ];
  const firstInput = recordingUpdateInput(
    firstRecordingId,
    "A Foggy Day",
    "Owner first",
  );
  const secondInput = recordingUpdateInput(
    secondRecordingId,
    "A Foggy Day (alternate)",
    "Owner second",
  );
  for (const input of [firstInput, secondInput]) {
    input.shared.release_group = {
      title: "Ella and Louis",
      musicbrainz_release_group_id: "ella-and-louis",
      attribution: releaseGroupAttribution,
    };
    input.shared.attribution = [];
    input.shared.personnel = [];
    await owner.mutation(api.recordings.update, input);
  }

  await t.mutation(internal.users.setRole, {
    clerkSubject: "album-credit-owner",
    role: "admin",
  });
  await owner.mutation(api.songs.setDiscoverability, {
    songId,
    isDiscoverable: true,
  });
  await other.mutation(api.songs.addDiscoverable, { songId });
  const otherRecordingId = await other.mutation(api.recordings.saveYoutube, {
    ...youtubeInput(songId),
    videoId: "lmnopqrstuv",
  });
  expect(otherRecordingId).toBe(secondRecordingId);

  const ownerArtist = (await owner.query(api.artists.listMine, {})).find(
    (artist) => artist.name === "Ella Fitzgerald",
  );
  const otherArtist = (await other.query(api.artists.listMine, {})).find(
    (artist) => artist.name === "Ella Fitzgerald",
  );
  expect(ownerArtist?.recordingCount).toBe(2);
  expect(otherArtist?.recordingCount).toBe(1);
  if (!ownerArtist || !otherArtist) {
    throw new Error("Expected the Release Group Attribution Artist");
  }

  await expect(
    owner.query(api.artists.getMine, { artistId: ownerArtist.id }),
  ).resolves.toMatchObject({
    recordings: [
      {
        id: firstRecordingId,
        release_groups: { title: "Ella and Louis" },
        relationship_reasons: ["release_group_attribution"],
        user_data: { notes: "Owner first" },
      },
      {
        id: secondRecordingId,
        release_groups: { title: "Ella and Louis" },
        relationship_reasons: ["release_group_attribution"],
        user_data: { notes: "Owner second" },
      },
    ],
  });
  await expect(
    other.query(api.artists.getMine, { artistId: otherArtist.id }),
  ).resolves.toMatchObject({
    recordings: [
      {
        id: secondRecordingId,
        release_groups: { title: "Ella and Louis" },
        relationship_reasons: ["release_group_attribution"],
        user_data: { notes: null },
      },
    ],
  });
});

test("only an admin can cache constrained shared Artist image metadata", async () => {
  const t = convexTest({ schema, modules });
  const owner = t.withIdentity(identity("owner"));
  const other = t.withIdentity(identity("other"));
  await owner.mutation(api.users.ensureCurrent, {});
  await other.mutation(api.users.ensureCurrent, {});
  await owner.mutation(api.songs.create, {
    requestId: "artist-song-2",
    shared: songInput("Conception"),
    writers: [
      {
        artistId: null,
        canonicalName: "George Shearing",
        creditedAs: "George Shearing",
        role: "composer",
        artistKind: "person",
        musicbrainzArtistId: "mb-george-shearing",
      },
    ],
  });
  const [artist] = await owner.query(api.artists.listMine, {});
  expect(artist).toBeDefined();
  await expect(
    other.mutation(api.artists.cacheImage, {
      artistId: artist.id,
      wikidataId: "Q123",
      imageUrl: null,
      sourceUrl: null,
      license: null,
    }),
  ).rejects.toThrow("Forbidden");

  await t.mutation(internal.users.setRole, {
    clerkSubject: "owner",
    role: "admin",
  });
  await expect(
    owner.mutation(api.artists.cacheImage, {
      artistId: artist.id,
      wikidataId: "not-wikidata",
      imageUrl: null,
      sourceUrl: null,
      license: null,
    }),
  ).rejects.toThrow("Invalid Wikidata Artist ID");
  const cached = await owner.mutation(api.artists.cacheImage, {
    artistId: artist.id,
    wikidataId: "Q123",
    imageUrl: "https://upload.wikimedia.org/example.jpg",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Example.jpg",
    license: "CC BY-SA 4.0",
  });
  expect(cached).toMatchObject({
    wikidata_id: "Q123",
    image_url: "https://upload.wikimedia.org/example.jpg",
  });
  expect(cached.image_lookup_completed_at).not.toBeNull();
});
