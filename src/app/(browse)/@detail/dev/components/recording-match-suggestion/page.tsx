"use client";

import RecordingMatchSuggestion from "@/components/RecordingMatchSuggestion";
import { RecordingMatchResult } from "@/utils/musicbrainz";

const match: RecordingMatchResult = {
  recordingId: "demo-1",
  title: "Have You Met Miss Jones?",
  artistCredit: "Frank Sinatra",
  album: "Sinatra Swings",
  albumReleaseId: "e2bd0fa3-6eb0-41cd-8565-44aee7a305cd",
  year: "1961",
  duration: "2:35",
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
