"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { RecordingAttributionInput } from "@/utils/musicbrainzRecordingAttribution";
import {
  addAttributionPart,
  changeManualArtistName,
  confirmProviderUnmatchedArtist,
  moveAttributionPart,
  removeAttributionPart,
  selectExistingArtist,
} from "@/utils/recordingAttributionEditor";

export default function RecordingAttributionEditor({
  value,
  onChange,
}: {
  value: RecordingAttributionInput[];
  onChange: (next: RecordingAttributionInput[]) => void;
}) {
  return (
    <fieldset className="mb-4">
      <legend className="block text-xs text-ink-600">Attribution</legend>
      <p className="mb-2 text-xs text-ink-600">
        Add each credited Artist in order. Following text is preserved exactly.
      </p>
      <div className="space-y-3">
        {value.map((part, index) => (
          <AttributionPartEditor
            key={`${index}-${part.artistId ?? part.musicbrainzArtistId ?? "new"}`}
            part={part}
            index={index}
            canMoveUp={index > 0}
            canMoveDown={index < value.length - 1}
            onChange={(next) =>
              onChange(value.map((current, currentIndex) =>
                currentIndex === index ? next : current,
              ))
            }
            onMove={(to) => onChange(moveAttributionPart(value, index, to))}
            onRemove={() => onChange(removeAttributionPart(value, index))}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange(addAttributionPart(value))}
        className="mt-2 text-sm text-azure-600 underline"
      >
        + Add credited Artist
      </button>
    </fieldset>
  );
}

function AttributionPartEditor({
  part,
  index,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
}: {
  part: RecordingAttributionInput;
  index: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (next: RecordingAttributionInput) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const matchingArtists = useQuery(api.artists.search, {
    query: part.name,
  });

  return (
    <div className="rounded-md border border-paper-600 p-3">
      <label className="block">
        <span className="block text-xs text-ink-600">Artist</span>
        <input
          value={part.name}
          onChange={(event) =>
            onChange(changeManualArtistName(part, event.target.value))
          }
          required
          className="block w-full p-1.5 rounded-md border border-paper-600"
          placeholder="Search or enter a new Artist"
        />
      </label>
      {matchingArtists && matchingArtists.length > 0 && (
        <div className="mt-1 rounded border border-paper-600 bg-surface-raised p-1">
          <p className="px-1 text-xs text-ink-600">Use an existing Artist</p>
          {matchingArtists.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => onChange(selectExistingArtist(part, artist))}
              className="block w-full rounded px-1 py-1 text-left text-sm hover:bg-paper-100"
            >
              {artist.name}
              {artist.musicbrainz_artist_id ? " (MusicBrainz)" : ""}
            </button>
          ))}
        </div>
      )}
      {!part.artistId && !part.musicbrainzArtistId && part.name.trim() && (
        matchingArtists === undefined ? (
          <p className="mt-1 text-xs text-ink-600">Searching existing Artists…</p>
        ) : part.providerUnmatchedConfirmed ? (
          <p className="mt-1 text-xs text-ink-600">
            A provider-unmatched Artist will be created when you save.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => onChange(confirmProviderUnmatchedArtist(part))}
            className="mt-1 text-xs text-azure-600 underline"
          >
            None of these match — create a provider-unmatched Artist
          </button>
        )
      )}
      <label className="mt-2 block">
        <span className="block text-xs text-ink-600">Credited as</span>
        <input
          value={part.creditedAs}
          onChange={(event) => onChange({ ...part, creditedAs: event.target.value })}
          required
          className="block w-full p-1.5 rounded-md border border-paper-600"
        />
      </label>
      <label className="mt-2 block">
        <span className="block text-xs text-ink-600">Following text</span>
        <input
          value={part.joinPhrase}
          onChange={(event) => onChange({ ...part, joinPhrase: event.target.value })}
          className="block w-full p-1.5 rounded-md border border-paper-600 font-mono"
          placeholder="For example:  with "
        />
      </label>
      <div className="mt-2 flex gap-3 text-xs">
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={() => onMove(index - 1)}
          className="text-azure-600 underline disabled:opacity-50"
        >
          Move up
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={() => onMove(index + 1)}
          className="text-azure-600 underline disabled:opacity-50"
        >
          Move down
        </button>
        <button type="button" onClick={onRemove} className="text-vermillion-600 underline">
          Remove
        </button>
      </div>
    </div>
  );
}
