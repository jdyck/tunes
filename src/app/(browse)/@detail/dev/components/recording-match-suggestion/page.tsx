"use client";

import RecordingMatchSuggestion from "@/components/RecordingMatchSuggestion";
import { RecordingMatchResult } from "@/utils/musicbrainz";

const match: RecordingMatchResult = {
  recordingId: "demo-1",
  title: "Autumn Leaves",
  artistCredit: "Bill Evans Trio",
  album: "Portrait in Jazz",
  year: "1960",
  duration: "5:04",
  score: 100,
};

export default function RecordingMatchSuggestionDemoPage() {
  return (
    <div className="max-w-md">
      <RecordingMatchSuggestion
        match={match}
        onConfirm={(m) => console.log("[demo] confirmed", m)}
        onReject={() => console.log("[demo] rejected")}
        onSearchManually={() => console.log("[demo] search manually")}
      />
    </div>
  );
}
