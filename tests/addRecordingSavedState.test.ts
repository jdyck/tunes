import test from "node:test";
import assert from "node:assert/strict";
import {
  deriveInitialSavedVideoState,
  markRecordingRemoved,
  markVideoRemoved,
  markVideoSaved,
  reconcileSavedVideoState,
} from "../src/utils/addRecordingSavedState.ts";
import type { SavedRecording } from "../src/types/types.ts";

const savedRecording = (
  id: string,
  videoIds: string[]
): SavedRecording => ({
  id,
  song_id: "song-1",
  name: id,
  user_data: { user_id: "user-1", recording_id: id },
  youtube_items: videoIds.map((videoId, index) => ({
    video_id: videoId,
    title: videoId,
    search_category: "song",
    discovery_sources: ["ytmusic_search"],
    association_created_at: `2026-07-26T00:00:0${index}Z`,
  })),
});

test("derives pre-existing saved state for every associated video", () => {
  const initial = deriveInitialSavedVideoState([
    savedRecording("recording-1", ["video000001", "video000002"]),
  ]);

  assert.deepEqual(initial, {
    savedByVideoId: {
      video000001: {
        recordingId: "recording-1",
        existedAtOpen: true,
      },
      video000002: {
        recordingId: "recording-1",
        existedAtOpen: true,
      },
    },
    duplicateVideoIds: [],
  });
});

test("flags one video associated with multiple saved recordings", () => {
  const initial = deriveInitialSavedVideoState([
    savedRecording("recording-1", ["video000001"]),
    savedRecording("recording-2", ["video000001"]),
  ]);

  assert.deepEqual(initial.savedByVideoId, {});
  assert.deepEqual(initial.duplicateVideoIds, ["video000001"]);
});

test("a successful session add is removable without pre-existing confirmation", () => {
  const saved = markVideoSaved({}, "video000001", "recording-1");

  assert.deepEqual(saved.video000001, {
    recordingId: "recording-1",
    existedAtOpen: false,
  });
  assert.deepEqual(markVideoRemoved(saved, "video000001"), {});
});

test("state transitions do not mutate the previous map", () => {
  const previous = {
    video000001: {
      recordingId: "recording-1",
      existedAtOpen: true,
    },
  };

  const saved = markVideoSaved(previous, "video000002", "recording-2");
  const removed = markVideoRemoved(saved, "video000001");

  assert.deepEqual(Object.keys(previous), ["video000001"]);
  assert.deepEqual(Object.keys(saved).sort(), ["video000001", "video000002"]);
  assert.deepEqual(Object.keys(removed), ["video000002"]);
});

test("removing a Recording clears every associated video check", () => {
  const previous = deriveInitialSavedVideoState([
    savedRecording("recording-1", ["video000001", "video000002"]),
    savedRecording("recording-2", ["video000003"]),
  ]).savedByVideoId;

  assert.deepEqual(
    Object.keys(markRecordingRemoved(previous, "recording-1")),
    ["video000003"]
  );
});

test("refresh adds all videos for a session-created Recording without confirmation", () => {
  const refreshed = reconcileSavedVideoState(
    [savedRecording("recording-1", ["video000001", "video000002"])],
    new Set(["recording-1"])
  );

  assert.equal(refreshed.savedByVideoId.video000001.existedAtOpen, false);
  assert.equal(refreshed.savedByVideoId.video000002.existedAtOpen, false);
});
