"use client";

import type { RecordingCandidate } from "@/lib/musicbrainz";
import { coverArtUrl } from "@/lib/recordingMetadataClient";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import { PlusCircleIcon } from "@heroicons/react/20/solid";
import { formatDurationSeconds } from "@/lib/youtube";

export default function RecordingMatchResultsList({
  results,
  onSelect,
}: {
  results: RecordingCandidate[];
  onSelect: (result: RecordingCandidate) => void;
}) {
  if (results.length === 0) return null;

  return (
    <ul className="mb-4">
      {results.map((result) => (
        <li key={result.recordingId} className="mb-2">
          <div className="flex items-center gap-2">
            <RecordingThumbnail
              src={coverArtUrl(result.releaseIdHint)}
              alt=""
              className="w-10 h-10 rounded shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">
                {result.title}
                {result.durationMs != null && (
                  <span className="font-normal text-ink-600">
                    {` (${formatDurationSeconds(Math.round(result.durationMs / 1000))})`}
                  </span>
                )}
              </p>
              {result.artistCredit && (
                <p className="truncate text-sm text-ink-700">
                  {result.artistCredit}
                </p>
              )}
              {result.releaseHint && (
                <p className="truncate text-xs text-ink-600">
                  {result.releaseHint}
                  {result.releaseYearHint && ` (${result.releaseYearHint})`}
                </p>
              )}
            </div>
            <button type="button" onClick={() => onSelect(result)} title="Use this match">
              <PlusCircleIcon className="h-6 w-6 text-green-600" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
