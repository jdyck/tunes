"use client";

import { useState } from "react";
import LinkButton from "@/components/ui/LinkButton";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import WikipediaBackgroundCard from "@/components/song/WikipediaBackgroundCard";
import { searchSongMetadata, fetchWorkBackground } from "@/lib/songMetadataClient";
import { SongWorkSearchResult } from "@/lib/musicbrainz";

export interface SongBackgroundValues {
  musicbrainzWorkId: string | null;
  wikipediaExtract: string | null;
  wikipediaUrl: string | null;
}

export default function SongBackgroundSection({
  sharedTitle,
  musicbrainzWorkId,
  wikipediaExtract,
  wikipediaUrl,
  canEditShared,
  onChange,
  onDirty,
}: SongBackgroundValues & {
  sharedTitle: string;
  canEditShared: boolean;
  onChange: (values: SongBackgroundValues) => void;
  onDirty: () => void;
}) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<SongWorkSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openSearch = async () => {
    setError(null);
    setShowSearch(true);
    setSearching(true);
    try {
      setSearchResults(await searchSongMetadata(sharedTitle));
    } catch {
      setError("Couldn't look up song metadata. Try again later.");
    }
    setSearching(false);
  };

  const lookUpBackground = async () => {
    if (!musicbrainzWorkId) return;

    setError(null);
    setLookingUp(true);
    const background = await fetchWorkBackground(musicbrainzWorkId);
    setLookingUp(false);

    if (!background) {
      setError("No Wikipedia background found for this song.");
      return;
    }

    onChange({ musicbrainzWorkId, wikipediaExtract: background.extract, wikipediaUrl: background.url });
    onDirty();
  };

  const selectBackgroundWork = async (result: SongWorkSearchResult) => {
    setShowSearch(false);
    setSearchResults([]);
    setError(null);
    onChange({
      musicbrainzWorkId: result.workId,
      wikipediaExtract: null,
      wikipediaUrl: null,
    });
    onDirty();

    setLookingUp(true);
    const background = await fetchWorkBackground(result.workId);
    setLookingUp(false);

    if (!background) {
      setError("No Wikipedia background found for this song.");
      return;
    }

    onChange({
      musicbrainzWorkId: result.workId,
      wikipediaExtract: background.extract,
      wikipediaUrl: background.url,
    });
  };

  const removeBackground = () => {
    onChange({ musicbrainzWorkId, wikipediaExtract: null, wikipediaUrl: null });
    onDirty();
  };

  return (
    <div className="mb-4">
      {showSearch ? (
        searching ? (
          <p className="text-sm text-ink-600">Looking up...</p>
        ) : (
          <SongWorkResultsList
            results={searchResults}
            onSelect={selectBackgroundWork}
          />
        )
      ) : (
        <>
          {musicbrainzWorkId && (
            <MusicBrainzLink type="work" id={musicbrainzWorkId} />
          )}

          {wikipediaExtract ? (
            <WikipediaBackgroundCard
              extract={wikipediaExtract}
              url={wikipediaUrl}
              onRemove={canEditShared ? removeBackground : undefined}
            />
          ) : canEditShared ? (
            <button
              type="button"
              onClick={musicbrainzWorkId ? lookUpBackground : openSearch}
              disabled={lookingUp}
              className="text-sm text-azure-600 underline disabled:opacity-70"
            >
              {lookingUp ? "Looking up..." : "Look up background"}
            </button>
          ) : null}

          {canEditShared && (musicbrainzWorkId || wikipediaExtract) && (
            <LinkButton
              variant="muted"
              onClick={openSearch}
              className="block mt-1"
            >
              Change match
            </LinkButton>
          )}
        </>
      )}
      {error && <p className="text-sm text-ink-600 mt-1">{error}</p>}
    </div>
  );
}
