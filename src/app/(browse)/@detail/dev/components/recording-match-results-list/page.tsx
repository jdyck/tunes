"use client";

import RecordingMatchResultsList from "@/components/recording/RecordingMatchResultsList";
import type { RecordingCandidate } from "@/lib/musicbrainz";

const results: RecordingCandidate[] = [
  {
    recordingId: "demo-1",
    title: "Autumn Leaves",
    artistCredit: "Bill Evans Trio",
    releaseHint: "Portrait in Jazz",
    releaseIdHint: null,
    durationMs: 304_000,
    workMatch: true,
    evidence: ["title", "artist", "linked Work"],
    score: 100,
  },
  {
    recordingId: "demo-2",
    title: "Autumn Leaves",
    artistCredit: "Cannonball Adderley",
    releaseHint: "Somethin' Else",
    releaseIdHint: null,
    durationMs: 659_000,
    workMatch: true,
    evidence: ["title", "artist", "linked Work"],
    score: 92,
  },
];

export default function RecordingMatchResultsListDemoPage() {
  return (
    <div className="max-w-md">
      <RecordingMatchResultsList
        results={results}
        onSelect={(result) => console.log("[demo] selected", result)}
      />
    </div>
  );
}
