"use client";

import AddRecordingMatchSuggestion from "@/components/recording/AddRecordingMatchSuggestion";
import { RecordingMatchResult } from "@/lib/musicbrainz";

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

export default function AddRecordingMatchSuggestionDemoPage() {
  return (
    <div className="max-w-md">
      <AddRecordingMatchSuggestion
        match={match}
        onConfirm={() => console.log("[demo] confirmed")}
        onSkip={() => console.log("[demo] skipped")}
        onCancel={() => console.log("[demo] cancelled")}
      />
    </div>
  );
}
