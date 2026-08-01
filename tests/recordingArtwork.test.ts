import assert from "node:assert/strict";
import test from "node:test";
import { recordingArtwork } from "../src/utils/recordingArtwork.ts";
import type { SavedRecording } from "../src/types/types.ts";

const recording = (
  overrides: Partial<SavedRecording> = {}
): SavedRecording => ({
  id: "recording-1",
  song_id: "song-1",
  name: "Autumn Leaves",
  user_data: { user_id: "user-1", recording_id: "recording-1" },
  youtube_items: [],
  ...overrides,
});

const youtubeItem = {
  video_id: "video000000",
  title: "Autumn Leaves",
  search_category: "song" as const,
  discovery_sources: ["ytmusic_search" as const],
  association_created_at: "2026-07-22T00:00:00Z",
};

const releaseGroup = {
  id: "release-group-1",
  title: "Portrait in Jazz",
  musicbrainz_release_group_id: "rg-mbid",
};

test("prefers Release Group cover art over the representative edition", () => {
  const { src } = recordingArtwork(
    recording({
      release_groups: releaseGroup,
      musicbrainz_release_id: "release-mbid",
    })
  );
  assert.match(src ?? "", /release-group\/rg-mbid/);
});

test("falls back to the representative edition when no Release Group is set", () => {
  const { src } = recordingArtwork(
    recording({ musicbrainz_release_id: "release-mbid" })
  );
  assert.match(src ?? "", /release\/release-mbid/);
});

test("keeps the YouTube thumbnail in reserve when cover art may not load", () => {
  const { src, fallbackSrc } = recordingArtwork(
    recording({ release_groups: releaseGroup, youtube_items: [youtubeItem] })
  );
  assert.match(src ?? "", /coverartarchive\.org/);
  assert.match(fallbackSrc ?? "", /video000000/);
});

test("uses the YouTube thumbnail directly when no release context exists", () => {
  const { src, fallbackSrc } = recordingArtwork(
    recording({ youtube_items: [youtubeItem] })
  );
  assert.match(src ?? "", /video000000/);
  // Nothing left to fall back to -- the placeholder takes over from here.
  assert.equal(fallbackSrc, null);
});

test("reports no artwork at all for a recording with no release and no video", () => {
  assert.deepEqual(recordingArtwork(recording()), {
    src: null,
    fallbackSrc: null,
  });
});
