import RecordingListRow from "@/components/recording/RecordingListRow";
import { SavedRecording } from "@/types/types";

const recording: SavedRecording = {
  id: "demo",
  song_id: "demo-song",
  name: "Autumn Leaves",
  artist: "Bill Evans Trio",
  user_data: {
    user_id: "demo-user",
    recording_id: "demo",
    key: "G minor",
    tempo: "120",
  },
  youtube_items: [
    {
      video_id: "demo0000000",
      title: "Autumn Leaves (Live at the Village Vanguard)",
      search_category: "song",
      discovery_sources: ["ytmusic_search"],
      association_created_at: "2026-07-22T00:00:00Z",
    },
  ],
};

export default function RecordingListRowDemoPage() {
  return (
    <div className="max-w-md border border-line-100 rounded-lg overflow-hidden">
      <RecordingListRow recording={recording} />
    </div>
  );
}
