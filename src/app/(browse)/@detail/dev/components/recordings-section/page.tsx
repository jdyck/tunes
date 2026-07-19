"use client";

import RecordingsSection from "@/components/song/RecordingsSection";
import { Recording } from "@/types/types";

const recordings: Recording[] = [
  {
    id: "demo-1",
    song_id: "demo-song",
    user_id: "demo-user",
    name: "Autumn Leaves",
    artist: "Bill Evans Trio",
    url: "https://www.youtube.com/watch?v=demo0000000",
  },
  {
    id: "demo-2",
    song_id: "demo-song",
    user_id: "demo-user",
    name: "Autumn Leaves",
    artist: "Cannonball Adderley",
    url: null,
  },
];

export default function RecordingsSectionDemoPage() {
  return (
    <div className="max-w-xl">
      <RecordingsSection
        songId="demo-song"
        songTitle="Autumn Leaves"
        recordings={recordings}
        youtubeData={{}}
        onRecordingAdded={() => {}}
      />
    </div>
  );
}
