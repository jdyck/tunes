"use client";

import type { RecordingCandidate } from "@/lib/musicbrainz";
import { coverArtUrl } from "@/lib/recordingMetadataClient";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

export default function RecordingMatchSuggestion({
  match,
  onConfirm,
  onReject,
  onSearchManually,
}: {
  match: RecordingCandidate;
  onConfirm: (match: RecordingCandidate) => void;
  onReject: () => void;
  onSearchManually: () => void;
}) {
  return (
    <div className="p-3 rounded-md border border-line-200 mb-4 flex gap-3">
      <RecordingThumbnail
        src={coverArtUrl(match.releaseIdHint)}
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
          {[match.releaseHint, match.durationMs ? `${Math.round(match.durationMs / 1000)}s` : null]
            .filter(Boolean).join(" · ") || "No provisional release details"}
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onConfirm(match)}
            className="flex items-center gap-1 text-sm text-teal-700"
          >
            <CheckCircleIcon className="h-5 w-5" />
            Confirm
          </button>
          <button
            type="button"
            onClick={onReject}
            className="flex items-center gap-1 text-sm text-ink-600"
          >
            <XCircleIcon className="h-5 w-5" />
            Not a match
          </button>
        </div>
        <button
          type="button"
          onClick={onSearchManually}
          className="block text-xs text-ink-600 underline mt-2"
        >
          Search manually instead
        </button>
      </div>
    </div>
  );
}
