import { SavedRecording } from "@/types/types";
import { recordingArtwork } from "@/utils/recordingArtwork";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";

export default function RecordingListRow({
  recording,
}: {
  recording: SavedRecording;
}) {
  const isMusicRecording = recording.kind === "released";
  const thumbnailClassName = isMusicRecording ? "w-20 h-20" : "w-24 h-16";
  const youtubeItem = recording.youtube_items[0];
  const artwork = recordingArtwork(recording);

  // The Song title is already on screen wherever this row appears, so the row
  // answers "which performance is this?": who played it, and on what release.
  // Unmatched rows and video captures have no album, so the recording's own
  // descriptor ("Live at the Village Vanguard") fills the line it would use.
  const descriptor = youtubeItem?.title || recording.name || "Untitled recording";
  const albumTitle = recording.release_groups?.title || recording.album || null;
  const primaryLine = recording.artist || descriptor;
  const secondaryLine = albumTitle || (recording.artist ? descriptor : null);

  return (
    <div className="flex overflow-hidden relative">
      <div className={`${thumbnailClassName} overflow-hidden shrink-0 p-3`}>
        <RecordingThumbnail
          src={artwork.src}
          fallbackSrc={artwork.fallbackSrc}
          alt=""
          className="w-full h-full"
        />
      </div>
      <div className="p-4 pl-0 overflow-hidden">
        <p className="font-semibold leading-5 line-clamp-2 overflow-hidden text-ellipsis wrap-break-word">
          {primaryLine}
        </p>
        {secondaryLine && (
          <p className="text-sm text-ink-600">{secondaryLine}</p>
        )}
      </div>
    </div>
  );
}
