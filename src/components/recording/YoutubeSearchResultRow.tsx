"use client";

import { YouTubeSearchResult } from "@/lib/youtube";
import {
  MusicalNoteIcon,
  PlayCircleIcon,
} from "@heroicons/react/20/solid";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { RecordingKind } from "@/types/types";
import RecordingResultToggleButton, {
  RecordingResultPendingState,
} from "@/components/recording/RecordingResultToggleButton";

export default function YoutubeSearchResultRow({
  result,
  kind,
  saved,
  pending,
  actionError,
  onPlay,
  onToggle,
  onKindChange,
}: {
  result: YouTubeSearchResult;
  kind: RecordingKind;
  saved: boolean;
  pending: RecordingResultPendingState;
  actionError?: string | null;
  onPlay: () => void;
  onToggle: () => void;
  onKindChange: (kind: RecordingKind) => void;
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
            {result.searchCategory === "song" && (
              <MusicalNoteIcon className="h-3 w-3 shrink-0" />
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          aria-label="Preview recording"
          title="Preview recording"
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full"
        >
          <PlayCircleIcon className="h-8 w-8 text-ink-400" />
        </button>
        <RecordingResultToggleButton
          saved={saved}
          pending={pending}
          onToggle={onToggle}
        />
      </div>
      {result.searchCategory === "video" && (
        <label className="block ml-[68px] mt-1 text-xs text-ink-600">
          Kind
          <select
            value={kind}
            disabled={pending !== null}
            onChange={(event) =>
              onKindChange(event.target.value as RecordingKind)
            }
            className="ml-2 rounded border border-line-200 bg-transparent disabled:opacity-60"
          >
            <option value="video_capture">Video capture</option>
            <option value="released">Released recording</option>
          </select>
        </label>
      )}
      {actionError && (
        <p className="ml-[68px] mt-1 text-xs text-mojo-600" role="alert">
          {actionError}
        </p>
      )}
    </li>
  );
}
