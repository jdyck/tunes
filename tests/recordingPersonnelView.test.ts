import assert from "node:assert/strict";
import test from "node:test";
import type { Id } from "../convex/_generated/dataModel.ts";
import { recordingPersonnelRows } from "../src/utils/recordingPersonnelView.ts";

test("presents generic Personnel as one linked Artist row without a suffix", () => {
  assert.deepEqual(
    recordingPersonnelRows(
      [],
      [
        {
          artistId: "artist-1" as Id<"artists">,
          musicbrainzArtistId: "mb-artist-1",
          name: "Ella Fitzgerald",
          creditedAs: "Ella Fitzgerald",
          kind: "person",
          relationships: [{ type: "performer", details: [] }],
        },
      ],
    ),
    [
      {
        artistId: "artist-1",
        creditedAs: "Ella Fitzgerald",
        details: [],
      },
    ],
  );
});

test("omits Personnel rows when the contract is empty", () => {
  assert.deepEqual(recordingPersonnelRows([], []), []);
});
