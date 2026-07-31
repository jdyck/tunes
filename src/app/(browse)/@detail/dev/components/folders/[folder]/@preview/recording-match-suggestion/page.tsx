"use client";

import RecordingMatchSuggestion from "@/components/recording/RecordingMatchSuggestion";
import type { RecordingCandidate } from "@/lib/musicbrainz";

const match: RecordingCandidate = {
  recordingId: "demo-1",
  title: "Have You Met Miss Jones?",
  artistCredit: "Frank Sinatra",
  releaseHint: "Sinatra Swings",
  releaseYearHint: "1961",
  releaseIdHint: "e2bd0fa3-6eb0-41cd-8565-44aee7a305cd",
  durationMs: 155_000,
  workMatch: true,
  evidence: ["title", "artist", "linked Work"],
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
