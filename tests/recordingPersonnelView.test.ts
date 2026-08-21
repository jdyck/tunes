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

test("orders Personnel by structured Attribution identity then unmatched Artist name", () => {
  const groupId = "artist-group" as Id<"artists">;
  const personId = "artist-person" as Id<"artists">;
  const unmatchedId = "artist-unmatched" as Id<"artists">;
  const attribution = [
    {
      artistId: groupId,
      musicbrainzArtistId: "mb-group",
      providerUnmatchedConfirmed: false,
      name: "Bill Evans Trio",
      creditedAs: "Bill Evans Trio",
      joinPhrase: "",
      kind: "group" as const,
    },
  ];
  const generic = [{ type: "performer" as const, details: [] }];

  assert.deepEqual(
    recordingPersonnelRows(attribution, [
      {
        artistId: personId,
        musicbrainzArtistId: "mb-person",
        name: "Bill Evans",
        creditedAs: "Bill Evans",
        kind: "person",
        relationships: generic,
      },
      {
        artistId: unmatchedId,
        musicbrainzArtistId: "mb-unmatched",
        name: "Alice Coltrane",
        creditedAs: "Alice Coltrane",
        kind: "person",
        relationships: generic,
      },
      {
        artistId: groupId,
        musicbrainzArtistId: "mb-group",
        name: "Bill Evans Trio",
        creditedAs: "The Bill Evans Trio",
        kind: "group",
        relationships: generic,
      },
    ]).map((row) => row.artistId),
    [groupId, unmatchedId, personId],
  );
});

test("sorts instrument details and uses credited-as and missing-detail labels", () => {
  const artistId = "artist-2" as Id<"artists">;
  assert.deepEqual(
    recordingPersonnelRows([], [
      {
        artistId,
        musicbrainzArtistId: "mb-artist-2",
        name: "Multi Instrumentalist",
        creditedAs: "Multi Instrumentalist",
        kind: "person",
        relationships: [
          {
            type: "instrument",
            details: [
              { canonical: "violin", credited_as: "1st violin" },
              { canonical: "guitar", credited_as: null },
              { canonical: "bass", credited_as: "upright bass" },
            ],
          },
        ],
      },
      {
        artistId: "artist-3" as Id<"artists">,
        musicbrainzArtistId: "mb-artist-3",
        name: "Unknown Instrumentalist",
        creditedAs: "Unknown Instrumentalist",
        kind: "person",
        relationships: [{ type: "instrument", details: [] }],
      },
    ]),
    [
      {
        artistId,
        creditedAs: "Multi Instrumentalist",
        details: ["1st violin", "guitar", "upright bass"],
      },
      {
        artistId: "artist-3",
        creditedAs: "Unknown Instrumentalist",
        details: ["instrument"],
      },
    ],
  );
});

test("orders instrument, vocal, conductor, and orchestra details by type", () => {
  const artistId = "artist-all-roles" as Id<"artists">;
  assert.deepEqual(
    recordingPersonnelRows([], [
      {
        artistId,
        musicbrainzArtistId: "mb-all-roles",
        name: "Multi Role Artist",
        creditedAs: "Multi Role Artist",
        kind: "person",
        relationships: [
          { type: "orchestra", details: [] },
          {
            type: "vocal",
            details: [
              { canonical: "lead vocals", credited_as: "voice" },
              { canonical: "backing vocals", credited_as: null },
            ],
          },
          { type: "conductor", details: [] },
          {
            type: "instrument",
            details: [
              { canonical: "piano", credited_as: null },
              { canonical: "bass", credited_as: null },
            ],
          },
        ],
      },
      {
        artistId: "artist-vocal" as Id<"artists">,
        musicbrainzArtistId: "mb-vocal",
        name: "Vocalist",
        creditedAs: "Vocalist",
        kind: "person",
        relationships: [{ type: "vocal", details: [] }],
      },
    ]),
    [
      {
        artistId,
        creditedAs: "Multi Role Artist",
        details: [
          "bass",
          "piano",
          "backing vocals",
          "voice",
          "conductor",
          "orchestra",
        ],
      },
      {
        artistId: "artist-vocal",
        creditedAs: "Vocalist",
        details: ["vocals"],
      },
    ],
  );
});
