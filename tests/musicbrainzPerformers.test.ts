import assert from "node:assert/strict";
import test from "node:test";
import { musicBrainzRecordingPerformers } from "../src/utils/musicbrainzPerformers.ts";

test("collapses an artist credited for several roles into one performer", () => {
  const performers = musicBrainzRecordingPerformers([
    { type: "instrument", artist: { id: "artist-1", name: "Joe Pass" } },
    { type: "vocal", artist: { id: "artist-1", name: "Joe Pass" } },
    {
      type: "performer",
      artist: { id: "artist-2", name: "Ella Fitzgerald", type: "Person" },
    },
  ]);

  // artist-1 appears once despite two role relations — a second credit would
  // violate recording_artist_credits_identity_key on save.
  assert.deepEqual(performers, [
    {
      musicbrainzArtistId: "artist-1",
      name: "Joe Pass",
      creditedAs: "Joe Pass",
      kind: null,
    },
    {
      musicbrainzArtistId: "artist-2",
      name: "Ella Fitzgerald",
      creditedAs: "Ella Fitzgerald",
      kind: "person",
    },
  ]);
});

test("keeps only performer-role relations and decodes credited-as", () => {
  const performers = musicBrainzRecordingPerformers([
    {
      type: "orchestra",
      artist: { id: "artist-3", name: "Nelson Riddle &amp; His Orchestra" },
      "target-credit": "Nelson Riddle &amp; Orchestra",
    },
    { type: "producer", artist: { id: "artist-4", name: "Out of scope" } },
    { type: "vocal", artist: undefined },
  ]);

  assert.deepEqual(performers, [
    {
      musicbrainzArtistId: "artist-3",
      name: "Nelson Riddle & His Orchestra",
      creditedAs: "Nelson Riddle & Orchestra",
      kind: null,
    },
  ]);
});

test("drops unsupported MusicBrainz artist kinds", () => {
  const performers = musicBrainzRecordingPerformers([
    {
      type: "performer",
      artist: { id: "artist-5", name: "Unknown act", type: "Ensemble" },
    },
  ]);

  assert.equal(performers[0]?.kind, null);
});
