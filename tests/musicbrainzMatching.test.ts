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
});

test("ranks Work-linked candidates first without hiding unlinked results", () => {
  const result = rankRecordingCandidateEvidence(butBeautifulCandidates, 229_000);

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.recordingId),
    [
      "f2959512-37dd-4058-8937-97c77620bca8",
      "c5564b36-9155-4bd6-b2db-6698d702936a",
      "unlinked-search-result",
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

test("selects Original and Primary Release Groups independently", () => {
  const result = selectReleaseGroups(releaseGroups);

  assert.equal(result.originalReleaseGroupId, "first-publication-compilation");
  assert.equal(
    result.primaryReleaseGroupId,
    "4c572b9f-bf8f-3238-a0c2-8185862ca5fa"
  );
  assert.equal(result.representativeReleaseId, "album-first-edition");
  assert.equal(result.originalAmbiguous, false);
  assert.equal(result.primaryAmbiguous, false);
});

test("rejects ineligible groups and preserves unresolved ties", () => {
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

  assert.equal(result.originalReleaseGroupId, null);
  assert.equal(result.primaryReleaseGroupId, "other-eligible-album");
  assert.equal(result.originalAmbiguous, true);
});

test("preserves Primary ambiguity when no eligible album wins the tie", () => {
  const withoutHint = releaseGroups.map((group) => ({
    ...group,
    albumHintMatch: false,
  }));
  const result = selectReleaseGroups(withoutHint);

  assert.equal(result.primaryReleaseGroupId, null);
  assert.equal(result.primaryAmbiguous, true);
});

test("does not force Original Release past undated official evidence", () => {
  const result = selectReleaseGroups([
    releaseGroups[2],
    {
      ...releaseGroups[3],
      releases: [
        { releaseId: "undated-official", date: null, status: "Official" },
      ],
    },
  ]);

  assert.equal(result.originalReleaseGroupId, null);
  assert.equal(result.originalAmbiguous, true);
});

test("allows Original and Primary to use the same Release Group", () => {
  const album = releaseGroups.find(
    (group) =>
      group.releaseGroupId === "4c572b9f-bf8f-3238-a0c2-8185862ca5fa"
  );
  assert.ok(album);

  const result = selectReleaseGroups([album]);
  assert.equal(result.originalReleaseGroupId, album.releaseGroupId);
  assert.equal(result.primaryReleaseGroupId, album.releaseGroupId);
  assert.equal(result.representativeReleaseId, "album-first-edition");
});
