"use client";

import RecordingMatchResultsList from "@/components/recording/RecordingMatchResultsList";
import { RecordingMatchResult } from "@/lib/musicbrainz";

const results: RecordingMatchResult[] = [
  {
    recordingId: "demo-1",
    title: "Autumn Leaves",
    artistCredit: "Bill Evans Trio",
    album: "Portrait in Jazz",
    albumReleaseId: null,
    year: "1960",
    duration: "5:04",
    score: 100,
  },
  {
    recordingId: "demo-2",
    title: "Autumn Leaves",
    artistCredit: "Cannonball Adderley",
    album: "Somethin' Else",
    albumReleaseId: null,
    year: "1958",
    duration: "10:59",
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
