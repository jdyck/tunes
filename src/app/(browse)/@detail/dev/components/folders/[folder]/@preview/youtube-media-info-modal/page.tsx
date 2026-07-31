"use client";

import { useState } from "react";
import YouTubeMediaInfoModal from "@/components/recording/YouTubeMediaInfoModal";
import PrimaryButton from "@/components/ui/PrimaryButton";
import type { RecordingYouTubeItem } from "@/types/types";

const items: RecordingYouTubeItem[] = [
  {
    video_id: "demo0000000",
    title: "Autumn Leaves (Live at the Village Vanguard)",
    channel_name: "Bill Evans",
    search_category: "song",
    discovery_sources: ["ytmusic_search"],
    ytmusic_artist_id: "demo-artist",
    ytmusic_artist_name: "Bill Evans",
    ytmusic_album_id: "demo-album",
    ytmusic_album_name: "Sunday at the Village Vanguard",
    duration_seconds: 354,
    metadata_fetched_at: "2026-07-22T18:30:00Z",
    association_created_at: "2026-07-22T18:31:00Z",
  },
];

export default function YouTubeMediaInfoModalDemoPage() {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PrimaryButton onClick={() => setOpen(true)} className="px-3 py-2">
        View media info
      </PrimaryButton>
      {open && (
        <YouTubeMediaInfoModal items={items} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
