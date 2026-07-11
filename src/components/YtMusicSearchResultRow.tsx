"use client";

import { YouTubeSearchResult } from "@/utils/youtube";
import { PlayCircleIcon, PlusCircleIcon } from "@heroicons/react/20/solid";
import RecordingThumbnail from "@/components/RecordingThumbnail";

export default function YtMusicSearchResultRow({
  result,
  adding,
  onPlay,
  onAdd,
}: {
  result: YouTubeSearchResult;
  adding: boolean;
  onPlay: () => void;
  onAdd: () => void;
}) {
  const subtext = [result.album, result.duration].filter(Boolean).join(" · ");

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
    </li>
  );
}
