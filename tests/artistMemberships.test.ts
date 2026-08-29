import assert from "node:assert/strict";
import test from "node:test";
import type { ArtistMembership } from "../src/types/artistMembership.ts";
import {
  formatArtistMembershipDetails,
  isArtistMembershipCacheFresh,
  musicBrainzArtistMemberships,
  validateArtistMemberships,
} from "../src/utils/artistMemberships.ts";
import { fetchArtistMemberships } from "../src/lib/artistMemberships.ts";
import { createMusicBrainzTransport } from "../src/lib/musicbrainzTransport.ts";

const memberId = "00000000-0000-0000-0000-000000000001";
const groupId = "00000000-0000-0000-0000-000000000002";
const relation = {
  "type-id": "5be4c609-9afa-4ea0-910b-12ffb71e3821",
  direction: "backward",
  artist: { id: memberId, name: "A &amp; B" },
  begin: "1955-03",
  end: "1957",
  ended: true,
  attributes: ["guitar", "task"],
  "attribute-credits": { guitar: "electric guitar" },
  "attribute-values": { task: "arranger" },
};

test("maps explicit group members and a person's groups in opposite directions", () => {
  const [member] = musicBrainzArtistMemberships({ relations: [relation] });
  assert.deepEqual(member, {
    musicbrainz_artist_id: memberId,
    name: "A & B",
    relationship: "member",
    begin: "1955-03",
    end: "1957",
    ended: true,
    attributes: ["electric guitar", "arranger"],
  });
  const [group] = musicBrainzArtistMemberships({
    relations: [
      {
        ...relation,
        direction: "forward",
        artist: { id: groupId, name: "The Group" },
      },
    ],
  });
  assert.equal(group.relationship, "group");
  assert.equal(group.musicbrainz_artist_id, groupId);
  assert.equal(
    formatArtistMembershipDetails(member),
    "electric guitar · arranger · 1955-03–1957",
  );
});

test("does not infer members from names, kinds, or unrelated Artist relationships", () => {
  assert.deepEqual(
    musicBrainzArtistMemberships({
      relations: [
        {
          ...relation,
          type: "member of band",
          "type-id": "some-other-relationship",
        },
      ],
    }),
    [],
  );
  assert.deepEqual(musicBrainzArtistMemberships({ relations: [] }), []);
});

test("preserves separate membership stints and does not label missing dates as current", () => {
  const items = musicBrainzArtistMemberships({
    relations: [
      { ...relation, begin: "1960", end: null, ended: true },
      relation,
      { ...relation, begin: null, end: null, ended: false, attributes: [] },
    ],
  });
  assert.equal(items.length, 3);
  assert.equal(formatArtistMembershipDetails(items[0]), "");
  assert.equal(
    formatArtistMembershipDetails(items[2]),
    "electric guitar · arranger · 1960–? · Former member",
  );
  assert.equal(
    formatArtistMembershipDetails({ ...items[0], begin: "2000" }),
    "From 2000",
  );
});

test("rejects malformed or oversized provider snapshots instead of caching a false empty result", () => {
  assert.throws(
    () => musicBrainzArtistMemberships({}),
    /Missing.*relationships/,
  );
  assert.throws(
    () =>
      musicBrainzArtistMemberships({
        relations: [{ ...relation, direction: null }],
      }),
    /direction/,
  );
  assert.throws(
    () =>
      musicBrainzArtistMemberships({
        relations: [{ ...relation, begin: "not-a-date" }],
      }),
    /date/,
  );
  const [item] = musicBrainzArtistMemberships({ relations: [relation] });
  assert.throws(
    () => validateArtistMemberships(Array.from({ length: 501 }, () => item)),
    /500/,
  );
  assert.throws(
    () =>
      validateArtistMemberships([
        { ...item, musicbrainz_artist_id: "unknown" },
      ]),
    /identity/,
  );
  assert.throws(
    () =>
      validateArtistMemberships(
        Array.from({ length: 500 }, () => ({
          ...item,
          name: "x".repeat(1_000),
        })),
      ),
    /too large/,
  );
});

test("refreshes successful and empty snapshots after a week, not on every view", () => {
  const now = Date.parse("2026-08-28T12:00:00Z");
  assert.equal(isArtistMembershipCacheFresh("2026-08-28T11:00:00Z", now), true);
  assert.equal(
    isArtistMembershipCacheFresh("2026-08-21T12:00:00Z", now),
    false,
  );
  assert.equal(
    isArtistMembershipCacheFresh("2026-08-29T12:00:00Z", now),
    false,
  );
  assert.equal(isArtistMembershipCacheFresh(null, now), false);
  assert.equal(isArtistMembershipCacheFresh("bad-date", now), false);
});

const transport = (body: unknown, status = 200, check?: (url: URL) => void) =>
  createMusicBrainzTransport({
    intervalMs: 0,
    fetchImplementation: async (input) => {
      check?.(new URL(input));
      return new Response(JSON.stringify(body), { status });
    },
  }).fetchJson;

test("requests Artist relationships through the shared transport and treats only 404 as a miss", async () => {
  const items: ArtistMembership[] = await fetchArtistMemberships(
    groupId,
    transport({ relations: [relation] }, 200, (url) => {
      assert.equal(url.pathname, `/ws/2/artist/${groupId}`);
      assert.equal(url.searchParams.get("inc"), "artist-rels");
      assert.equal(url.searchParams.get("fmt"), "json");
    }),
  );
  assert.equal(items.length, 1);
  assert.deepEqual(
    await fetchArtistMemberships(groupId, transport({}, 404)),
    [],
  );
  await assert.rejects(
    fetchArtistMemberships(groupId, transport({}, 503)),
    /503/,
  );
  await assert.rejects(
    fetchArtistMemberships(groupId, transport({})),
    /Missing.*relationships/,
  );
});
