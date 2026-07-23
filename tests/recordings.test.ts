import assert from "node:assert/strict";
import test from "node:test";
import { mapSavedRecordingRow } from "../src/lib/recordings.ts";

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
