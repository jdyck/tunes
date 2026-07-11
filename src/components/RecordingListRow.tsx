import { Recording } from "@/types/types";
import RecordingThumbnail from "@/components/RecordingThumbnail";

export default function RecordingListRow({
  recording,
  videoInfo,
}: {
  recording: Recording;
  videoInfo: any;
}) {
  return (
    <div className="flex overflow-hidden relative">
      <div className="w-20 h-16 overflow-hidden shrink-0">
        <RecordingThumbnail
          src={videoInfo?.thumbnails?.high?.url}
          alt="Video thumbnail"
          className="w-full h-full"
        />
      </div>
      <div className="p-4 pl-4 overflow-hidden">
        <p className="font-semibold leading-5 line-clamp-2 overflow-hidden text-ellipsis break-words">
          {videoInfo?.title ||
            recording.name ||
            recording.url ||
            "Untitled recording"}
        </p>
        {recording.artist && (
          <p className="text-sm text-ink-600">{recording.artist}</p>
        )}
      </div>
    </div>
  );
}
