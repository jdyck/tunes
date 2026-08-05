import assert from "node:assert/strict";
import test from "node:test";
import {
  mapSavedRecordingRow,
  mapSongArtworkRows,
} from "../src/lib/recordings.ts";
import {
  performerCreditsToDraft,
  performersToSavePayload,
} from "../src/utils/recordingPerformers.ts";

test("maps preferred key and tempo from private Recording data", () => {
  const savedRecording = mapSavedRecordingRow({
    user_id: "user-1",
    recording_id: "recording-1",
    notes: "Transpose for the singer",
    key: "E-flat major",
    tempo: "96",
    recordings: {
      id: "recording-1",
      song_id: "song-1",
      name: "But Beautiful",
      artist: "Nat King Cole",
    },
  });

  assert.equal(savedRecording?.user_data.key, "E-flat major");
  assert.equal(savedRecording?.user_data.tempo, "96");
  assert.equal("key" in (savedRecording ?? {}), false);
  assert.equal("tempo" in (savedRecording ?? {}), false);
});

test("preserves loaded performer credits through the Recording save payload", () => {
  const savedRecording = mapSavedRecordingRow({
    user_id: "user-1",
    recording_id: "recording-1",
    recordings: {
      id: "recording-1",
      song_id: "song-1",
      name: "But Beautiful",
      recording_artist_credits: [
        {
          recording_id: "recording-1",
          artist_id: "artist-2",
          role: "performer",
          credited_as: "Cole, Nat King",
          sort_order: 1,
          artists: {
            id: "artist-2",
            name: "Nat King Cole",
            kind: "person",
            musicbrainz_artist_id: "artist-mbid-2",
          },
        },
        {
          recording_id: "recording-1",
          artist_id: "artist-1",
          role: "performer",
          credited_as: "Oscar Moore",
          sort_order: 0,
          artists: [
            {
              id: "artist-1",
              name: "Oscar Moore",
              kind: "person",
              musicbrainz_artist_id: "artist-mbid-1",
            },
          ],
        },
      ],
    },
  });

  assert.ok(savedRecording);
  const draft = performerCreditsToDraft(
    savedRecording.recording_artist_credits ?? []
  );

  assert.deepEqual(performersToSavePayload(draft), [
    {
      name: "Oscar Moore",
      credited_as: "Oscar Moore",
      kind: "person",
      musicbrainz_artist_id: "artist-mbid-1",
    },
    {
      name: "Nat King Cole",
      credited_as: "Cole, Nat King",
      kind: "person",
      musicbrainz_artist_id: "artist-mbid-2",
    },
  ]);
});

const artworkRow = (
  songId: string,
  recording: Record<string, unknown> = {}
) => ({
  recordings: {
    song_id: songId,
    musicbrainz_release_id: null,
    release_groups: null,
    recording_youtube_items: null,
    ...recording,
  },
});

test("gives a Song the artwork of its first Recording in the User's order", () => {
  const artwork = mapSongArtworkRows([
    artworkRow("song-1", {
      release_groups: { musicbrainz_release_group_id: "top-rg" },
    }),
    artworkRow("song-1", {
      release_groups: { musicbrainz_release_group_id: "later-rg" },
    }),
  ]);

  assert.match(artwork.get("song-1")?.src ?? "", /top-rg/);
});

test("prefers a song-category video over a capture for the fallback image", () => {
  const artwork = mapSongArtworkRows([
    artworkRow("song-1", {
      release_groups: { musicbrainz_release_group_id: "rg-mbid" },
      recording_youtube_items: [
        {
          created_at: "2026-07-01T00:00:00Z",
          youtube_items: {
            video_id: "capture0000",
            search_category: "video",
          },
        },
        {
          created_at: "2026-07-22T00:00:00Z",
          youtube_items: { video_id: "song0000000", search_category: "song" },
        },
      ],
    }),
  ]);

  assert.match(artwork.get("song-1")?.fallbackSrc ?? "", /song0000000/);
});

// PostgREST returns an embedded to-one relationship as an object or as a
// single-element array depending on how it resolves the relationship.
test("reads embedded relationships whether they arrive boxed or not", () => {
  const artwork = mapSongArtworkRows([
    {
      recordings: [
        {
          song_id: "song-1",
          musicbrainz_release_id: null,
          release_groups: [{ musicbrainz_release_group_id: "rg-mbid" }],
          recording_youtube_items: null,
        },
      ],
    },
  ]);

  assert.match(artwork.get("song-1")?.src ?? "", /release-group\/rg-mbid/);
});

test("leaves a Song out entirely when it has no saved Recording", () => {
  assert.equal(mapSongArtworkRows([]).has("song-1"), false);
});
