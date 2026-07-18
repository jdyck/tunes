"use client";

import { RecordingMatchResult } from "@/lib/musicbrainz";
import { coverArtUrl } from "@/lib/recordingMetadataClient";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

export default function AddRecordingMatchSuggestion({
  match,
  onConfirm,
  onSkip,
  onCancel,
}: {
  match: RecordingMatchResult;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="p-3 rounded-md border border-line-200 flex gap-3">
      <RecordingThumbnail
        src={coverArtUrl(match.albumReleaseId)}
        alt=""
        className="w-14 h-14 rounded shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-600 mb-1">Found a likely match on MusicBrainz</p>
        <p className="truncate">
          {match.title}
          {match.artistCredit && (
            <span className="text-ink-600"> — {match.artistCredit}</span>
          )}
        </p>
        <p className="truncate text-xs text-ink-600 mb-2">
          {[match.album, match.year, match.duration].filter(Boolean).join(" · ") ||
            "No release details found"}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1 text-sm text-teal-700"
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
