import assert from "node:assert/strict";
import test from "node:test";
import {
  formatArtistRecordingRelationshipReasons,
  type ArtistRecordingRelationshipReason,
} from "../src/utils/artistRecordingRelationship.ts";

test("formats one Artist Recording relationship reason", () => {
  assert.equal(
    formatArtistRecordingRelationshipReasons(["attribution"]),
    "Recording Attribution",
  );
});

test("formats several Artist Recording relationship reasons on one row", () => {
  assert.equal(
    formatArtistRecordingRelationshipReasons(["attribution", "personnel"]),
    "Recording Attribution · Personnel",
  );
});

test("labels an album-credit relationship with its Release Group title", () => {
  assert.equal(
    formatArtistRecordingRelationshipReasons(
      ["release_group_attribution", "attribution", "personnel"],
      "Ella and Louis",
    ),
    "Album credit: Ella and Louis · Recording Attribution · Personnel",
  );
});

test("omits the relationship label for an older Artist Recording view", () => {
  assert.equal(
    formatArtistRecordingRelationshipReasons(
      undefined as unknown as readonly ArtistRecordingRelationshipReason[],
    ),
    null,
  );
});
