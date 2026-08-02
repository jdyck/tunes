"use client";

import type { RecordingCandidate } from "@/lib/musicbrainz";
import { coverArtUrl } from "@/lib/recordingMetadataClient";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";
import { formatDurationSeconds } from "@/lib/youtube";

export default function AddRecordingMatchSuggestion({
  match,
  onConfirm,
  onSkip,
  onCancel,
}: {
  match: RecordingCandidate;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3 rounded-md border border-paper-600 flex gap-3">
      <RecordingThumbnail
        src={coverArtUrl(match.releaseIdHint)}
        alt=""
        className="w-14 h-14 rounded shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-600 mb-1">Found a likely match on MusicBrainz</p>
        <p className="truncate font-medium">
          {match.title}
          {match.durationMs != null && (
            <span className="font-normal text-ink-600">
              {` (${formatDurationSeconds(Math.round(match.durationMs / 1000))})`}
            </span>
          )}
        </p>
        {match.artistCredit && (
          <p className="truncate text-sm text-ink-700">
            {match.artistCredit}
          </p>
        )}
        {match.releaseHint && (
          <p className="mb-2 truncate text-xs text-ink-600">
            {match.releaseHint}
            {match.releaseYearHint && ` (${match.releaseYearHint})`}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1 text-sm text-azure-900"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Use this match
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex items-center gap-1 text-sm text-ink-600"
          >
            <XCircleIcon className="h-5 w-5" />
            Add without it
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="block text-xs text-ink-600 underline mt-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
