import assert from "node:assert/strict";
import test from "node:test";
import { musicBrainzReleaseGroupAttribution } from "../src/utils/musicbrainzReleaseGroupAttribution.ts";

test("decodes and preserves every selected MusicBrainz Release Group credit part", () => {
  assert.deepEqual(
    musicBrainzReleaseGroupAttribution([
      {
        name: "Nat &amp; ‘King’ Cole and His Trio",
        joinphrase: " encounters ",
        artist: {
          id: "nat-king-cole-trio",
          name: "The Nat King Cole Trio",
          type: "Group",
        },
      },
      {
        name: "Nat King Cole",
        joinphrase: " / ",
        artist: {
          id: "nat-king-cole",
          name: "Nat King Cole",
          type: "Person",
        },
      },
      {
        name: "The Trio",
        artist: {
          id: "nat-king-cole-trio",
          name: "The Nat King Cole Trio",
          type: "Group",
        },
      },
    ]),
    [
      {
        artistId: null,
        musicbrainzArtistId: "nat-king-cole-trio",
        providerUnmatchedConfirmed: false,
        name: "The Nat King Cole Trio",
        creditedAs: "Nat & ‘King’ Cole and His Trio",
        joinPhrase: " encounters ",
        kind: "group",
      },
      {
        artistId: null,
        musicbrainzArtistId: "nat-king-cole",
        providerUnmatchedConfirmed: false,
        name: "Nat King Cole",
        creditedAs: "Nat King Cole",
        joinPhrase: " / ",
        kind: "person",
      },
      {
        artistId: null,
        musicbrainzArtistId: "nat-king-cole-trio",
        providerUnmatchedConfirmed: false,
        name: "The Nat King Cole Trio",
        creditedAs: "The Trio",
        joinPhrase: "",
        kind: "group",
      },
    ],
  );
});

test("rejects an incomplete Release Group credit instead of treating it as an empty credit", () => {
  assert.throws(
    () => musicBrainzReleaseGroupAttribution([{ name: "Unlinked credit" }]),
    /canonical Artist identity/,
  );
});
