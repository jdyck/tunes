import RecordingListRow from "@/components/recording/RecordingListRow";
import { SavedRecording } from "@/types/types";

const recording: SavedRecording = {
  id: "demo",
  song_id: "demo-song",
  name: "Autumn Leaves",
  artist: "Bill Evans Trio",
  release_groups: {
    id: "demo-release-group",
    title: "Portrait in Jazz",
    musicbrainz_release_group_id: "demo-mbid",
  },
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
      channel_name: "Bill Evans - Topic",
      search_category: "song",
      discovery_sources: ["ytmusic_search"],
      association_created_at: "2026-07-22T00:00:00Z",
    },
  ],
};

const channelUnknownRecording: SavedRecording = {
  ...recording,
  id: "demo-channel-unknown",
  youtube_items: [
    {
      video_id: "demo0000001",
      title: "Autumn Leaves (Live at the Village Vanguard)",
      channel_name: null,
      search_category: "song",
      discovery_sources: ["ytmusic_search"],
      association_created_at: "2026-07-22T00:00:00Z",
    },
  ],
};

export default function RecordingListRowDemoPage() {
  return (
    <div className="space-y-4">
      <div className="max-w-md border border-paper-600 rounded-lg overflow-hidden">
        <RecordingListRow recording={recording} />
      </div>
      <div>
        <p className="mb-1 text-xs text-ink-600">
          YouTube channel unknown — the red artist flags rows needing
          &ldquo;Update YouTube info&rdquo;
        </p>
        <div className="max-w-md border border-paper-600 rounded-lg overflow-hidden">
          <RecordingListRow recording={channelUnknownRecording} />
        </div>
      </div>
    </div>
  );
}
