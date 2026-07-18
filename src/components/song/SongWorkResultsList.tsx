"use client";

import { SongWorkSearchResult } from "@/lib/musicbrainz";
import { PlusCircleIcon } from "@heroicons/react/20/solid";

export default function SongWorkResultsList({
  results,
  onSelect,
}: {
  results: SongWorkSearchResult[];
  onSelect: (result: SongWorkSearchResult) => void;
}) {
  if (results.length === 0) return null;

  return (
    <ul className="mb-4">
      {results.map((result) => (
        <li key={result.workId} className="mb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="truncate">
                {result.title}
                {result.disambiguation && (
                  <span className="text-ink-600"> ({result.disambiguation})</span>
                )}
              </p>
              <p className="truncate text-xs text-ink-600">
                {(() => {
                  const credited = Array.from(
                    new Set([...result.composers, ...result.lyricists, ...result.writers])
                  );
                  return credited.length > 0
                    ? credited.join(", ")
                    : "No writer credits found";
                })()}
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
