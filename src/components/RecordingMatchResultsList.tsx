"use client";

import { RecordingMatchResult } from "@/utils/musicbrainz";
import { coverArtUrl } from "@/utils/recordingMetadataClient";
import RecordingThumbnail from "@/components/RecordingThumbnail";
import { PlusCircleIcon } from "@heroicons/react/20/solid";

export default function RecordingMatchResultsList({
  results,
  onSelect,
}: {
  results: RecordingMatchResult[];
  onSelect: (result: RecordingMatchResult) => void;
}) {
  if (results.length === 0) return null;

  return (
    <ul className="mb-4">
      {results.map((result) => (
        <li key={result.recordingId} className="mb-2">
          <div className="flex items-center gap-2">
            <RecordingThumbnail
              src={coverArtUrl(result.albumReleaseId)}
              alt=""
              className="w-10 h-10 rounded shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="truncate">
                {result.title}
                {result.artistCredit && (
                  <span className="text-ink-600"> — {result.artistCredit}</span>
                )}
              </p>
              <p className="truncate text-xs text-ink-600">
                {[result.album, result.year, result.duration]
                  .filter(Boolean)
                  .join(" · ") || "No release details found"}
              </p>
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
