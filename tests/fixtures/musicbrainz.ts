import type {
  RecordingCandidateEvidence,
  ReleaseGroupEvidence,
} from "../../src/utils/musicbrainzMatching.ts";

export const BUT_BEAUTIFUL_WORK_ID = "10f9d66d-700a-3267-9551-2938a219ebf9";

export const butBeautifulCandidates: RecordingCandidateEvidence[] = [
  {
    recordingId: "unlinked-search-result",
    titleMatch: true,
    artistMatch: true,
    durationMs: 228_000,
    workMatch: false,
    performanceDateStart: null,
    performanceDateEnd: null,
    relationshipAttributes: [],
    albumHintMatch: true,
    score: 100,
  },
  {
    recordingId: "c5564b36-9155-4bd6-b2db-6698d702936a",
    titleMatch: true,
    artistMatch: true,
    durationMs: 229_000,
    workMatch: true,
    performanceDateStart: "1958-05",
    performanceDateEnd: null,
    relationshipAttributes: [],
    albumHintMatch: false,
    score: 99,
  },
  {
    recordingId: "f2959512-37dd-4058-8937-97c77620bca8",
    titleMatch: true,
    artistMatch: true,
    durationMs: 230_000,
    workMatch: true,
    performanceDateStart: "1958-05",
    performanceDateEnd: null,
    relationshipAttributes: [],
    albumHintMatch: true,
    score: 98,
  },
];

export const releaseGroups: ReleaseGroupEvidence[] = [
  {
    releaseGroupId: "not-this-recording",
    title: "Unrelated Early Album",
    primaryType: "Album",
    secondaryTypes: [],
    containsRecording: false,
    albumHintMatch: true,
    releases: [
      { releaseId: "unrelated-release", date: "1955", status: "Official" },
    ],
  },
  {
    releaseGroupId: "first-publication-compilation",
    title: "Archive Discoveries",
    primaryType: "Album",
    secondaryTypes: ["Compilation"],
    containsRecording: true,
    albumHintMatch: false,
    releases: [
      { releaseId: "compilation-release", date: "1957-12", status: "Official" },
    ],
  },
  {
    releaseGroupId: "4c572b9f-bf8f-3238-a0c2-8185862ca5fa",
    title: "The Very Thought of You",
    primaryType: "Album",
    secondaryTypes: [],
    containsRecording: true,
    albumHintMatch: true,
    releases: [
      { releaseId: "album-late-edition", date: "1962", status: "Official" },
      { releaseId: "album-first-edition", date: "1958-06", status: "Official" },
    ],
  },
  {
    releaseGroupId: "other-eligible-album",
    title: "Another Album Context",
    primaryType: "Album",
    secondaryTypes: [],
    containsRecording: true,
    albumHintMatch: false,
    releases: [
      { releaseId: "other-album-release", date: "1958-07", status: "Official" },
    ],
  },
  {
    releaseGroupId: "remix-group",
    title: "The Remixes",
    primaryType: "Album",
    secondaryTypes: ["Remix"],
    containsRecording: true,
    albumHintMatch: true,
    releases: [
      { releaseId: "remix-release", date: "1958-01", status: "Official" },
    ],
  },
];
