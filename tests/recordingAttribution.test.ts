import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRecordingArtistDisplay,
  formatRecordingAttribution,
} from "../src/utils/recordingAttribution.ts";

const attribution = [
  {
    recording_id: "recording-1",
    artist_id: "artist-1",
    credited_as: "The Bill Evans Trio",
    join_phrase: " with ",
    sort_order: 0,
    artists: {
      id: "artist-1",
      name: "Bill Evans Trio",
      kind: "group" as const,
      musicbrainz_artist_id: "bill-evans-trio",
    },
  },
  {
    recording_id: "recording-1",
    artist_id: "artist-1",
    credited_as: "Bill Evans",
    join_phrase: " / ",
    sort_order: 1,
    artists: {
      id: "artist-1",
      name: "Bill Evans Trio",
      kind: "group" as const,
      musicbrainz_artist_id: "bill-evans-trio",
    },
  },
  {
    recording_id: "recording-1",
    artist_id: "artist-2",
    credited_as: "Guests",
    join_phrase: "",
    sort_order: 2,
    artists: {
      id: "artist-2",
      name: "Guests",
      kind: null,
      musicbrainz_artist_id: "guests",
    },
  },
];

test("formats ordered Recording Attribution without changing join-phrase whitespace", () => {
  assert.equal(
    formatRecordingAttribution(attribution),
    "The Bill Evans Trio with Bill Evans / Guests",
  );
});

test("uses Attribution before fallback, provider text, and Recording descriptor", () => {
  assert.equal(
    formatRecordingArtistDisplay({
      attribution,
      fallback: "Legacy flat credit",
      providerHint: "YouTube Music channel",
      descriptor: "Village Vanguard capture",
    }),
    "The Bill Evans Trio with Bill Evans / Guests",
  );
  assert.equal(
    formatRecordingArtistDisplay({
      attribution: [],
      fallback: "Legacy flat credit",
      providerHint: "YouTube Music channel",
      descriptor: "Village Vanguard capture",
    }),
    "Legacy flat credit",
  );
  assert.equal(
    formatRecordingArtistDisplay({
      attribution: [],
      fallback: "   ",
      providerHint: "YouTube Music channel",
      descriptor: "Village Vanguard capture",
    }),
    "YouTube Music channel",
  );
  assert.equal(
    formatRecordingArtistDisplay({
      attribution: [],
      fallback: null,
      providerHint: null,
      descriptor: "Village Vanguard capture",
    }),
    "Village Vanguard capture",
  );
});
