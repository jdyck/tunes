import test from "node:test";
import assert from "node:assert/strict";
import { effectiveSongTitle } from "../src/utils/songTitle.ts";

test("uses a trimmed private display title when present", () => {
  assert.equal(
    effectiveSongTitle(
      { name: "I've Found a New Baby" },
      { display_title: "  I Found a New Baby  " }
    ),
    "I Found a New Baby"
  );
});

test("falls back to the shared title for blank or absent overrides", () => {
  const song = { name: "Body and Soul" };
  assert.equal(effectiveSongTitle(song, { display_title: "   " }), song.name);
  assert.equal(effectiveSongTitle(song, null), song.name);
});
