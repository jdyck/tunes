"use client";

import { useState } from "react";
import RecordingsSection from "@/components/song/RecordingsSection";
import { SavedRecording } from "@/types/types";

const initialRecordings: SavedRecording[] = [
  {
    id: "demo-1",
    song_id: "demo-song",
    name: "Autumn Leaves",
    artist: "Bill Evans Trio",
    user_data: {
      user_id: "demo-user",
      recording_id: "demo-1",
      key: "G minor",
      tempo: "120",
    },
    youtube_items: [
      {
        video_id: "demo0000000",
        title: "Autumn Leaves",
        search_category: "song",
        discovery_sources: ["ytmusic_search"],
        association_created_at: "2026-07-22T00:00:00Z",
      },
    ],
  },
  {
    id: "demo-2",
    song_id: "demo-song",
    name: "Autumn Leaves",
    artist: "Cannonball Adderley",
    album: "Somethin' Else",
    user_data: { user_id: "demo-user", recording_id: "demo-2" },
    youtube_items: [],
  },
  {
    id: "demo-3",
    song_id: "demo-song",
    name: "Live at the Village Vanguard",
    kind: "video_capture",
    user_data: { user_id: "demo-user", recording_id: "demo-3" },
    youtube_items: [],
  },
];

export default function RecordingsSectionDemoPage() {
  // Held in state so the drag handles actually reorder here, without a
  // database behind them.
  const [recordings, setRecordings] = useState(initialRecordings);

  return (
    <div className="max-w-xl">
      <RecordingsSection
        songId="demo-song"
        songTitle="Autumn Leaves"
        recordings={recordings}
        onRecordingsChanged={() => {}}
        onReorder={async (reordered) => {
          setRecordings(reordered);
          return true;
        }}
      />
    </div>
  );
}
