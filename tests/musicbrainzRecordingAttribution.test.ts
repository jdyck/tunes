import assert from "node:assert/strict";
import test from "node:test";
import { musicBrainzRecordingAttribution } from "../src/utils/musicbrainzRecordingAttribution.ts";

test("decodes and preserves every MusicBrainz Recording credit part", () => {
  assert.deepEqual(
    musicBrainzRecordingAttribution([
      {
        name: "Duke Ellington &amp; His Orchestra",
        joinphrase: " featuring ",
        artist: {
          id: "duke-ellington",
          name: "Duke Ellington &amp; His Orchestra",
          type: "Orchestra",
        },
      },
      {
        name: "Duke",
        joinphrase: " / ",
        artist: {
          id: "duke-ellington",
          name: "Duke Ellington",
          type: "Person",
        },
      },
      {
        name: "Guests",
        artist: { id: "guests", name: "Guests" },
      },
    ]),
    [
      {
        musicbrainzArtistId: "duke-ellington",
        name: "Duke Ellington & His Orchestra",
        creditedAs: "Duke Ellington & His Orchestra",
        joinPhrase: " featuring ",
        kind: "orchestra",
      },
      {
        musicbrainzArtistId: "duke-ellington",
        name: "Duke Ellington",
        creditedAs: "Duke",
        joinPhrase: " / ",
        kind: "person",
      },
      {
        musicbrainzArtistId: "guests",
        name: "Guests",
        creditedAs: "Guests",
        joinPhrase: "",
        kind: null,
      },
    ],
  );
});

test("rejects incomplete provider credit payloads instead of silently replacing Attribution", () => {
  assert.throws(
    () => musicBrainzRecordingAttribution([{ name: "Unlinked credit" }]),
    /canonical Artist identity/,
  );
});
