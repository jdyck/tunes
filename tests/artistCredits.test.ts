import assert from "node:assert/strict";
import test from "node:test";
import { musicBrainzSongArtistCredits } from "../src/utils/musicbrainzArtistCredits.ts";
import { writersFromMusicBrainz } from "../src/utils/writerCredits.ts";

test("normalizes MusicBrainz Artist identity, kind, and credited-as text", () => {
  const credits = musicBrainzSongArtistCredits([
    {
      type: "composer",
      artist: {
        id: "artist-1",
        name: "Duke Ellington &amp; His Orchestra",
        type: "Group",
      },
      "target-credit": "Duke Ellington &amp; Orchestra",
    },
    {
      type: "lyricist",
      artist: { id: "artist-2", name: "Unknown Type Artist" },
    },
    {
      type: "producer",
      artist: { id: "artist-3", name: "Out of scope" },
    },
  ]);

  assert.deepEqual(credits, [
    {
      musicbrainzArtistId: "artist-1",
      canonicalName: "Duke Ellington & His Orchestra",
      creditedAs: "Duke Ellington & Orchestra",
      artistKind: "group",
      role: "composer",
    },
    {
      musicbrainzArtistId: "artist-2",
      canonicalName: "Unknown Type Artist",
      creditedAs: "Unknown Type Artist",
      artistKind: null,
      role: "lyricist",
    },
  ]);
});

test("retains a stable local Artist ID for an unambiguous provider refresh", () => {
  const [writer] = writersFromMusicBrainz(
    [
      {
        musicbrainzArtistId: "mbid-1",
        canonicalName: "Richard Rodgers",
        creditedAs: "Richard Rodgers",
        artistKind: "person",
        role: "composer",
      },
    ],
    [
      {
        artistId: "local-artist-1",
        canonicalName: "Richard Rodgers",
        creditedAs: "Richard Rodgers",
        role: "composer",
      },
    ]
  );

  assert.equal(writer.artistId, "local-artist-1");
  assert.equal(writer.musicbrainzArtistId, "mbid-1");
  assert.equal(writer.artistKind, "person");
});

test("does not reconcile conflicting provider identities by name", () => {
  const [writer] = writersFromMusicBrainz(
    [
      {
        musicbrainzArtistId: "new-mbid",
        canonicalName: "Alex Smith",
        creditedAs: "Alex Smith",
        artistKind: null,
        role: "writer",
      },
    ],
    [
      {
        artistId: "local-artist-2",
        canonicalName: "Alex Smith",
        creditedAs: "Alex Smith",
        musicbrainzArtistId: "different-mbid",
        role: "writer",
      },
    ]
  );

  assert.equal(writer.artistId, null);
});

test("reuses one local Artist when that Artist has more than one role", () => {
  const writers = writersFromMusicBrainz(
    [
      {
        musicbrainzArtistId: "mbid-3",
        canonicalName: "Sammy Cahn",
        creditedAs: "Sammy Cahn",
        artistKind: "person",
        role: "composer",
      },
      {
        musicbrainzArtistId: "mbid-3",
        canonicalName: "Sammy Cahn",
        creditedAs: "Sammy Cahn",
        artistKind: "person",
        role: "lyricist",
      },
    ],
    [
      {
        artistId: "local-artist-3",
        canonicalName: "Sammy Cahn",
        creditedAs: "Sammy Cahn",
        role: "composer",
      },
      {
        artistId: "local-artist-3",
        canonicalName: "Sammy Cahn",
        creditedAs: "Sammy Cahn",
        role: "lyricist",
      },
    ]
  );

  assert.deepEqual(
    writers.map(({ artistId, role }) => ({ artistId, role })),
    [
      { artistId: "local-artist-3", role: "composer" },
      { artistId: "local-artist-3", role: "lyricist" },
    ]
  );
});
