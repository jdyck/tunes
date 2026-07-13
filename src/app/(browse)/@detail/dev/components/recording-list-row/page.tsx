import RecordingListRow from "@/components/RecordingListRow";
import { Recording } from "@/types/types";

const recording: Recording = {
  id: "demo",
  tune_id: "demo-tune",
  user_id: "demo-user",
  name: "Autumn Leaves",
  artist: "Bill Evans Trio",
  url: "https://www.youtube.com/watch?v=demo0000000",
};

const videoInfo = {
  title: "Autumn Leaves (Live at the Village Vanguard)",
  thumbnails: {
    high: {
      url: "",
    },
  },
};

export default function RecordingListRowDemoPage() {
  return (
    <div className="max-w-md border border-line-100 rounded-lg overflow-hidden">
      <RecordingListRow recording={recording} videoInfo={videoInfo} />
    </div>
  );
}
