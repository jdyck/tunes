import assert from "node:assert/strict";
import test from "node:test";
import { collectTags, hasTag, normalizeTags } from "../src/utils/songTags.ts";
import {
  defaultExcludeHoliday,
  matchesSongFilters,
  projectedFavoriteCount,
  projectedTagCount,
} from "../src/utils/songFilters.ts";
import type { SongWithUserData } from "../src/types/types.ts";

const song = (
  id: string,
  tags: string[],
  favorite = false
): SongWithUserData => ({
  id,
  name: id,
  is_discoverable: true,
  user_data: {
    user_id: "user-1",
    song_id: id,
    created_at: "2026-07-26T00:00:00Z",
    favorite,
    tags,
  },
});

test("normalizes Song tags and reuses existing spelling", () => {
  assert.deepEqual(
    normalizeTags([" ballad ", "BALLAD", "holiday", ""], ["Holiday"]),
    ["ballad", "Holiday"]
  );
  assert.equal(hasTag(["Holiday"], "holiday"), true);
});

test("collects a case-insensitive sorted tag vocabulary", () => {
  assert.deepEqual(
    collectTags([["Waltz", "Ballad"], null, ["ballad", "Holiday"]]),
    ["Ballad", "Holiday", "Waltz"]
  );
});

test("defaults Holiday exclusion around the seasonal boundary", () => {
  assert.equal(defaultExcludeHoliday(new Date(2026, 10, 15)), true);
  assert.equal(defaultExcludeHoliday(new Date(2026, 10, 16)), false);
  assert.equal(defaultExcludeHoliday(new Date(2026, 11, 31)), false);
  assert.equal(defaultExcludeHoliday(new Date(2027, 0, 1)), true);
});

test("composes favorites and included tags as narrowing filters", () => {
  const songs = [
    song("one", ["Ballad", "Waltz"], true),
    song("two", ["Ballad"], true),
    song("three", ["Waltz"], false),
  ];
  const filters = {
    favoriteOnly: true,
    includedTags: ["ballad", "WALTZ"],
    excludeHoliday: false,
  };

  assert.deepEqual(songs.filter((item) => matchesSongFilters(item, filters)).map((item) => item.id), ["one"]);
});

test("facets report the result count after adding a criterion", () => {
  const songs = [
    song("one", ["Ballad", "Waltz"], true),
    song("two", ["Ballad", "Holiday"], false),
    song("three", ["Ballad"], true),
  ];
  const filters = {
    favoriteOnly: false,
    includedTags: ["Ballad"],
    excludeHoliday: true,
  };

  assert.equal(projectedTagCount(songs, filters, "Waltz"), 1);
  assert.equal(projectedTagCount(songs, filters, "Holiday"), 0);
  assert.equal(projectedFavoriteCount(songs, filters), 2);
});
