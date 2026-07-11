"use client";

import { RecordingMatchResult } from "@/utils/musicbrainz";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/20/solid";

export default function RecordingMatchSuggestion({
  match,
  onConfirm,
  onReject,
  onSearchManually,
}: {
  match: RecordingMatchResult;
  onConfirm: (match: RecordingMatchResult) => void;
  onReject: () => void;
  onSearchManually: () => void;
}) {
  return (
    <div className="p-3 rounded-md border border-line-200 mb-4">
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
  );
}
