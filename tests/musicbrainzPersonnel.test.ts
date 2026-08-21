import assert from "node:assert/strict";
import test from "node:test";
import { musicBrainzRecordingPersonnel } from "../src/utils/musicbrainzPersonnel.ts";

test("groups distinct instrument evidence for one Artist and removes generic fallback", () => {
  assert.deepEqual(
    musicBrainzRecordingPersonnel([
      {
        type: "performer",
        artist: { id: "artist-1", name: "Joe Pass", type: "Person" },
      },
      {
        type: "instrument",
        artist: { id: "artist-1", name: "Joe Pass", type: "Person" },
        attributes: ["guitar", "piano"],
        "attribute-values": { guitar: "guitar", piano: "piano" },
        "attribute-credits": { guitar: "electric guitar" },
      },
      {
        type: "instrument",
        artist: { id: "artist-1", name: "Joe Pass", type: "Person" },
        attributes: ["GUITAR", "violin", "violin"],
        "attribute-values": {
          GUITAR: " guitar ",
          violin: "violin",
        },
        "attribute-credits": {
          GUITAR: " Electric   Guitar ",
          violin: "1st violin",
        },
      },
      {
        type: "instrument",
        artist: { id: "artist-1", name: "Joe Pass", type: "Person" },
        attributes: ["violin"],
        "attribute-values": { violin: "violin" },
        "attribute-credits": { violin: "2nd violin" },
      },
    ]),
    [
      {
        artistId: null,
        musicbrainzArtistId: "artist-1",
        name: "Joe Pass",
        creditedAs: "Joe Pass",
        kind: "person",
        relationships: [
          {
            type: "instrument",
            details: [
              { canonical: "guitar", credited_as: "electric guitar" },
              { canonical: "piano", credited_as: null },
              { canonical: "violin", credited_as: "1st violin" },
              { canonical: "violin", credited_as: "2nd violin" },
            ],
          },
        ],
      },
    ],
  );
});

test("keeps known instrument evidence without a named detail", () => {
  assert.deepEqual(
    musicBrainzRecordingPersonnel([
      {
        type: "instrument",
        artist: { id: "artist-2", name: "Unknown Player" },
        attributes: [],
      },
    ])[0]?.relationships,
    [{ type: "instrument", details: [] }],
  );
});

test("excludes qualifiers, unsupported roles, malformed relations, and raw source fields", () => {
  assert.deepEqual(
    musicBrainzRecordingPersonnel([
      {
        type: "instrument",
        artist: { id: "artist-3", name: "Valid Player" },
        attributes: ["guest", "solo", "additional", "assistant", "drums"],
        "attribute-values": { drums: "drums" },
        begin: "1959",
        end: "1960",
      },
      { type: "producer", artist: { id: "artist-4", name: "Producer" } },
      { type: "instrument", artist: { id: "", name: "Missing ID" } },
      { type: "instrument", artist: { id: "artist-5", name: "" } },
    ]),
    [
      {
        artistId: null,
        musicbrainzArtistId: "artist-3",
        name: "Valid Player",
        creditedAs: "Valid Player",
        kind: null,
        relationships: [
          {
            type: "instrument",
            details: [{ canonical: "drums", credited_as: null }],
          },
        ],
      },
    ],
  );
});
