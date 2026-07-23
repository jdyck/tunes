import assert from "node:assert/strict";
import test from "node:test";
import { earliestMusicBrainzWriterYear } from "../src/utils/musicbrainzSongYear.ts";

test("selects the earliest dated writer relationship", () => {
  assert.equal(
    earliestMusicBrainzWriterYear([
      { type: "composer", begin: "1937-04" },
      { type: "lyricist", begin: "1936" },
      { type: "writer", begin: "1936-12-01" },
    ]),
    "1936"
  );
});

test("ignores dates from non-writer relationships", () => {
  assert.equal(
    earliestMusicBrainzWriterYear([
      { type: "performance", begin: "1929" },
      { type: "publisher", begin: "1930" },
      { type: "composer", begin: "1935" },
    ]),
    "1935"
  );
});

test("returns null when writer relationships are undated", () => {
  assert.equal(
    earliestMusicBrainzWriterYear([
      { type: "composer" },
      { type: "lyricist", begin: "" },
      { type: "performance", begin: "1942" },
    ]),
    null
  );
});

test("rejects malformed and impossible relationship dates", () => {
  assert.equal(
    earliestMusicBrainzWriterYear([
      { type: "composer", begin: "1935-ish" },
      { type: "lyricist", begin: "1935-13" },
      { type: "writer", begin: "0000" },
    ]),
    null
  );
});
