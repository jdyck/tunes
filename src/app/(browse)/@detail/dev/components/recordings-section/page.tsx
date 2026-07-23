"use client";

import RecordingsSection from "@/components/song/RecordingsSection";
import { SavedRecording } from "@/types/types";

const recordings: SavedRecording[] = [
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
    user_data: { user_id: "demo-user", recording_id: "demo-2" },
    youtube_items: [],
  },
];

export default function RecordingsSectionDemoPage() {
  return (
    <div className="max-w-xl">
      <RecordingsSection
        songId="demo-song"
        songTitle="Autumn Leaves"
        recordings={recordings}
        onRecordingAdded={() => {}}
      />
    </div>
  );
}
