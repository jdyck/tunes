"use client";

import { YouTubeSearchResult } from "@/lib/youtube";
import {
  MusicalNoteIcon,
  PlayCircleIcon,
  PlusCircleIcon,
} from "@heroicons/react/20/solid";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";

export default function YoutubeSearchResultRow({
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
  return (
    <li className="mb-2">
      <div className="flex items-center gap-2">
        <RecordingThumbnail
          src={result.thumbnail}
          className="w-[60px] h-[45px] rounded border border-line-200 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="truncate">{result.title}</p>
          <p className="truncate text-xs text-ink-600 flex items-center gap-1">
            <span className="truncate">
              {result.channelTitle.replace(/ - Topic$/, "")}
            </span>
            {/* TODO: once a YouTube Music lookup-by-title exists, make this
                icon a button that jumps to the matching YT Music result. */}
            {result.isMusic && (
              <MusicalNoteIcon className="h-3 w-3 shrink-0" />
            )}
          </p>
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
