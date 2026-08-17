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

test("requires authentication for Artist browsing", async () => {
  const t = convexTest({ schema, modules });
  await expect(t.query(api.artists.listMine, {})).rejects.toThrow(
    "Unauthenticated",
  );
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
      release_group: null,
      performers: [
        {
          name: "Sarah Vaughan",
          credited_as: "Sarah Vaughan",
          kind: "person",
          musicbrainz_artist_id: "mb-sarah-vaughan",
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
  expect(ownerDetail?.recording_song_titles).toEqual([
    { song_id: songId, title: "Lullaby of Birdland" },
  ]);
  expect(otherDetail?.recordings).toEqual([]);
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
