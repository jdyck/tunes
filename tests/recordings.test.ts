import assert from "node:assert/strict";
import test from "node:test";
import { mapSavedRecordingRow } from "../src/lib/recordings.ts";
import {
  personnelEntriesToDraft,
  personnelEntriesToSavePayload,
} from "../src/utils/recordingPersonnel.ts";

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
  const draft = personnelEntriesToDraft(savedRecording.personnel ?? []);

  assert.deepEqual(personnelEntriesToSavePayload(draft), [
    {
      type: "existing",
      artist_id: "artist-1",
      credited_as: "Oscar Moore",
      relationships: [{ type: "performer", details: [] }],
    },
    {
      type: "existing",
      artist_id: "artist-2",
      credited_as: "Cole, Nat King",
      relationships: [{ type: "performer", details: [] }],
    },
  ]);
});
