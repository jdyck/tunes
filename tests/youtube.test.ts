import test from "node:test";
import assert from "node:assert/strict";
import {
  extractYouTubeID,
  mergeDiscoverySources,
  mergeSearchCategory,
  preferNonNull,
} from "../src/lib/youtube.ts";

test("normalizes supported YouTube URL variants", () => {
  const id = "jNQXAC9IVRw";
  assert.equal(extractYouTubeID(id), id);
  assert.equal(extractYouTubeID(`https://youtu.be/${id}?t=3`), id);
  assert.equal(
    extractYouTubeID(`https://www.youtube.com/watch?list=demo&v=${id}`),
    id
  );
  assert.equal(extractYouTubeID(`https://youtube.com/shorts/${id}`), id);
  assert.equal(extractYouTubeID("https://example.com/not-youtube"), null);
});

test("song evidence wins category merging", () => {
  assert.equal(mergeSearchCategory("video", "song"), "song");
  assert.equal(mergeSearchCategory("song", "video"), "song");
  assert.equal(mergeSearchCategory("video", "video"), "video");
});

test("discovery-source merging unions without duplicates", () => {
  assert.deepEqual(
    mergeDiscoverySources(
      ["youtube_search", "manual_url"],
      ["ytmusic_search", "youtube_search"]
    ),
    ["manual_url", "youtube_search", "ytmusic_search"]
  );
});

test("null enrichment never erases an existing value", () => {
  assert.equal(preferNonNull("existing", null), "existing");
  assert.equal(preferNonNull("existing", "richer"), "richer");
});
