import { SavedRecording } from "@/types/types";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";

export default function RecordingListRow({
  recording,
}: {
  recording: SavedRecording;
}) {
  const isMusicRecording = recording.kind === "released";
  const thumbnailClassName = isMusicRecording ? "w-20 h-20" : "w-24 h-16";
  const youtubeItem = recording.youtube_items[0];

  return (
    <div className="flex overflow-hidden relative">
      <div className={`${thumbnailClassName} overflow-hidden shrink-0`}>
        <RecordingThumbnail
          src={
            youtubeItem ? youtubeThumbnailUrl(youtubeItem.video_id) : null
          }
          alt="Video thumbnail"
          className="w-full h-full"
        />
      </div>
      <div className="p-4 pl-4 overflow-hidden">
        <p className="font-semibold leading-5 line-clamp-2 overflow-hidden text-ellipsis break-words">
          {youtubeItem?.title ||
            recording.name ||
            "Untitled recording"}
        </p>
        {recording.artist && (
          <p className="text-sm text-ink-600">{recording.artist}</p>
        )}
      </div>
    </div>
  );
}
