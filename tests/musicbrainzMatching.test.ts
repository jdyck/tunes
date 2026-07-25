import assert from "node:assert/strict";
import test from "node:test";
import {
  parseMusicBrainzDate,
  parseMusicBrainzDateRange,
  rankRecordingCandidateEvidence,
  selectReleaseGroups,
} from "../src/utils/musicbrainzMatching.ts";
import {
  butBeautifulCandidates,
  releaseGroups,
} from "./fixtures/musicbrainz.ts";

test("parses partial MusicBrainz dates and valid ranges", () => {
  assert.deepEqual(parseMusicBrainzDate("1958"), {
    value: "1958",
    precision: "year",
    year: 1958,
    month: null,
    day: null,
  });
  assert.equal(parseMusicBrainzDate("1958-02-30"), null);
  assert.deepEqual(parseMusicBrainzDateRange("1958-05", "1958-06"), {
    start: {
      value: "1958-05",
      precision: "month",
      year: 1958,
      month: 5,
      day: null,
    },
    end: {
      value: "1958-06",
      precision: "month",
      year: 1958,
      month: 6,
      day: null,
    },
  });
  assert.equal(parseMusicBrainzDateRange("1958-06", "1958-05"), null);
  assert.deepEqual(parseMusicBrainzDateRange("1958-05", "1958-05"), {
    start: {
      value: "1958-05",
      precision: "month",
      year: 1958,
      month: 5,
      day: null,
    },
    end: null,
  });
});

test("ranks by duration and album before Work linkage without hiding results", () => {
  const result = rankRecordingCandidateEvidence(butBeautifulCandidates, 229_000);

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordingId),
    [
      "f2959512-37dd-4058-8937-97c77620bca8",
      "unlinked-search-result",
      "c5564b36-9155-4bd6-b2db-6698d702936a",
    ]
  );
  assert.equal(result.candidates.length, butBeautifulCandidates.length);
});

test("preserves ambiguity between otherwise-tied Work-linked candidates", () => {
  const result = rankRecordingCandidateEvidence(butBeautifulCandidates, 229_000);

  assert.equal(result.state, "ambiguous");
  assert.deepEqual(new Set(result.ambiguousCandidateIds), new Set([
    "c5564b36-9155-4bd6-b2db-6698d702936a",
    "f2959512-37dd-4058-8937-97c77620bca8",
  ]));
});

test("selects the earliest non-compilation studio album", () => {
  const result = selectReleaseGroups(releaseGroups);

  assert.equal(
    result.releaseGroupId,
    "4c572b9f-bf8f-3238-a0c2-8185862ca5fa"
  );
  assert.equal(result.title, "The Very Thought of You");
  assert.equal(result.representativeReleaseId, "album-first-edition");
});

test("uses chronology rather than an album hint between eligible albums", () => {
  const tiedOriginal = releaseGroups.map((group) =>
    group.releaseGroupId === "other-eligible-album"
      ? {
          ...group,
          albumHintMatch: true,
          releases: [
            { releaseId: "tied-release", date: "1957-12", status: "Official" },
          ],
        }
      : group.releaseGroupId === "4c572b9f-bf8f-3238-a0c2-8185862ca5fa"
        ? { ...group, albumHintMatch: false }
        : group
  );
  const result = selectReleaseGroups(tiedOriginal);

  assert.equal(result.releaseGroupId, "other-eligible-album");
});

test("does not require an album hint to select a studio album", () => {
  const withoutHint = releaseGroups.map((group) => ({
    ...group,
    albumHintMatch: false,
  }));
  const result = selectReleaseGroups(withoutHint);

  assert.equal(result.releaseGroupId, "4c572b9f-bf8f-3238-a0c2-8185862ca5fa");
});

test("falls back to any containing group when no studio album exists", () => {
  const result = selectReleaseGroups([
    releaseGroups[1],
    {
      ...releaseGroups[4],
      releases: [
        { releaseId: "undated-official", date: null, status: "Official" },
      ],
    },
  ]);

  assert.equal(result.releaseGroupId, "first-publication-compilation");
});

test("selects a sole eligible Release Group", () => {
  const album = releaseGroups.find(
    (group) =>
      group.releaseGroupId === "4c572b9f-bf8f-3238-a0c2-8185862ca5fa"
  );
  assert.ok(album);

  const result = selectReleaseGroups([album]);
  assert.equal(result.releaseGroupId, album.releaseGroupId);
  assert.equal(result.representativeReleaseId, "album-first-edition");
});
