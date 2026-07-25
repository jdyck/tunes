import assert from "node:assert/strict";
import test from "node:test";
import {
  matchAlbumTracks,
  normalizeAlbumTrackTitle,
} from "../src/utils/albumImportMatching.ts";

const media = (title: string, durationSeconds: number | null, videoId: string) => ({
  videoId,
  title,
  artistId: null,
  artistName: "Bill Evans Trio",
  durationSeconds,
  thumbnail: "",
});

const recording = (title: string, durationMs: number, recordingId: string) => ({
  recordingId,
  title,
  durationMs,
  mediumPosition: 1,
  trackPosition: 1,
});

test("normalizes reissue noise without erasing take markers", () => {
  assert.equal(normalizeAlbumTrackTitle("The Autumn Leaves (Remastered)"), "autumn leaves");
  assert.equal(normalizeAlbumTrackTitle("Autumn Leaves - Take 2"), "autumn leaves take 2");
  assert.equal(
    normalizeAlbumTrackTitle("Autumn Leaves (Album Version - Take 2 Bonus Track)"),
    "autumn leaves take 2"
  );
});

test("matches take-labelled media to the base Song while preserving the Recording take", () => {
  const result = matchAlbumTracks(
    [media("Autumn Leaves (Album Version - Take 2)", 323, "video-take-two")],
    [
      recording("Autumn Leaves (take 1 stereo)", 358_000, "take-one"),
      recording("Autumn Leaves (take 2 monaural)", 324_000, "take-two"),
    ],
    [{
      id: "song-one",
      title: "Autumn Leaves",
      canonicalTitle: "Autumn Leaves",
      musicbrainzWorkId: "work-one",
    }]
  );
  assert.equal(result[0].state, "ready");
  assert.equal(result[0].recording?.recordingId, "take-two");
  assert.equal(result[0].song?.id, "song-one");
});

test("imports only an unambiguous track mapped to an existing Song", () => {
  const result = matchAlbumTracks(
    [media("Autumn Leaves", 323, "video-one")],
    [
      recording("Autumn Leaves", 358_000, "take-one"),
      recording("Autumn Leaves", 323_000, "take-two"),
    ],
    [
      {
        id: "song-one",
        title: "Autumn Leaves",
        canonicalTitle: "Autumn Leaves",
        musicbrainzWorkId: "work-one",
      },
    ]
  );

  assert.equal(result[0].state, "ready");
  assert.equal(result[0].recording?.recordingId, "take-two");
  assert.equal(result[0].song?.id, "song-one");
});

test("leaves tracks without repertoire Songs untouched", () => {
  const result = matchAlbumTracks(
    [media("Blue in Green", 325, "video-two")],
    [recording("Blue in Green", 325_000, "recording-two")],
    []
  );

  assert.equal(result[0].state, "no-song");
  assert.equal(result[0].song, null);
});

test("refuses ambiguous Song and Recording matches", () => {
  const duplicateSongs = [
    { id: "one", title: "Solar", canonicalTitle: "Solar", musicbrainzWorkId: null },
    { id: "two", title: "Solar", canonicalTitle: "Solar", musicbrainzWorkId: null },
  ];
  assert.equal(
    matchAlbumTracks(
      [media("Solar", 300, "video-three")],
      [recording("Solar", 300_000, "recording-three")],
      duplicateSongs
    )[0].state,
    "ambiguous-song"
  );

  assert.equal(
    matchAlbumTracks(
      [media("Solar", 300, "video-three")],
      [
        recording("Solar", 299_000, "recording-three"),
        recording("Solar", 301_000, "recording-four"),
      ],
      [duplicateSongs[0]]
    )[0].state,
    "ambiguous-recording"
  );
});
