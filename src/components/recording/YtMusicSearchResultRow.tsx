"use client";

import { YouTubeSearchResult } from "@/lib/youtube";
import { PlayCircleIcon, PlusCircleIcon } from "@heroicons/react/20/solid";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { formatDurationSeconds } from "@/lib/youtube";
import { RecordingKind } from "@/types/types";

export default function YtMusicSearchResultRow({
  result,
  kind,
  adding,
  onPlay,
  onAdd,
  onKindChange,
}: {
  result: YouTubeSearchResult;
  kind: RecordingKind;
  adding: boolean;
  onPlay: () => void;
  onAdd: () => void;
  onKindChange: (kind: RecordingKind) => void;
}) {
  const subtext = [
    result.albumName,
    result.durationSeconds != null
      ? formatDurationSeconds(result.durationSeconds)
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="mb-2">
      <div className="flex items-center gap-2">
        <RecordingThumbnail
          src={result.thumbnail}
          className="w-[60px] h-[45px] rounded border border-line-200 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="truncate">{result.title}</p>
          <p className="truncate text-xs text-ink-600">{result.channelTitle}</p>
          {subtext && (
            <p className="truncate text-xs text-ink-600">{subtext}</p>
          )}
        </div>
        <button type="button" onClick={onPlay} title="Preview">
          <PlayCircleIcon className="h-6 w-6 text-ink-400" />
        </button>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          title="Add this recording"
        >
          <PlusCircleIcon
            className={`h-6 w-6 text-green-600 ${adding ? "opacity-50" : ""}`}
          />
        </button>
      </div>
      {result.searchCategory === "video" && (
        <label className="block ml-[68px] mt-1 text-xs text-ink-600">
          Kind
          <select
            value={kind}
            onChange={(event) =>
              onKindChange(event.target.value as RecordingKind)
            }
            className="ml-2 rounded border border-line-200 bg-transparent"
          >
            <option value="video_capture">Video capture</option>
            <option value="released">Released recording</option>
          </select>
        </label>
      )}
    </li>
  );
}
