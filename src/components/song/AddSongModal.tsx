"use client";

import { useRef, useState } from "react";
import { useConvex, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Song } from "@/types/types";
import { SongWorkSearchResult } from "@/lib/musicbrainz";
import { WorkBackground } from "@/lib/wikipedia";
import { WriterInput } from "@/lib/songWriters";
import { writersFromMusicBrainz } from "@/utils/writerCredits";
import { searchSongMetadata, fetchWorkPreview } from "@/lib/songMetadataClient";
import Modal from "@/components/ui/Modal";
import SongWritersEditor from "@/components/song/SongWritersEditor";
import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import FormField from "@/components/ui/FormField";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import WikipediaBackgroundCard from "@/components/song/WikipediaBackgroundCard";
import PrimaryButton from "@/components/ui/PrimaryButton";

const creditedNames = (result: SongWorkSearchResult): string[] =>
  Array.from(
    new Set(result.artistCredits.map((credit) => credit.creditedAs))
  );

const writersFromResult = (result: SongWorkSearchResult): WriterInput[] =>
  writersFromMusicBrainz(result.artistCredits);

const toConvexWriters = (writers: WriterInput[]) =>
  writers.map((writer) => ({
    // This creation flow does not accept unvalidated client-side Artist IDs.
    // Provider identity or canonical name handles reuse.
    artistId: null,
    canonicalName: writer.canonicalName ?? null,
    creditedAs: writer.creditedAs,
    role: writer.role,
    artistKind: writer.artistKind ?? null,
    musicbrainzArtistId: writer.musicbrainzArtistId ?? null,
  }));

export default function AddSongModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const convex = useConvex();
  const createSongMutation = useMutation(api.songs.create);
  const addDiscoverableSong = useMutation(api.songs.addDiscoverable);
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const createRequestId = useRef<string | null>(null);

  const [discoverableSongs, setDiscoverableSongs] = useState<Song[]>([]);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SongWorkSearchResult[]>(
    []
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // The result the user tapped "Add" on, now shown on the read-only
  // confirm screen while its year/background are fetched.
  const [previewResult, setPreviewResult] = useState<SongWorkSearchResult | null>(
    null
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewYear, setPreviewYear] = useState<string | null>(null);
  const [previewWorkDateStart, setPreviewWorkDateStart] = useState<string | null>(null);
  const [previewWorkDateEnd, setPreviewWorkDateEnd] = useState<string | null>(null);
  const [previewBackground, setPreviewBackground] =
    useState<WorkBackground | null>(null);

  const [manualMode, setManualMode] = useState(false);
  const [manualWriters, setManualWriters] = useState<WriterInput[]>([]);
  const [manualYear, setManualYear] = useState("");

  const handleSearch = async () => {
    setSearchError(null);
    setDiscoveryError(null);

    if (!name.trim()) {
      return;
    }

    setSearching(true);
    const [metadataResult, discoverableResult] = await Promise.allSettled([
      searchSongMetadata(name),
      convex.query(api.songs.searchDiscoverable, { term: name.trim() }),
    ]);

    if (metadataResult.status === "fulfilled") {
      setSearchResults(metadataResult.value);
    } else {
      setSearchError("Couldn't look up song metadata. Try again later.");
      setSearchResults([]);
    }

    if (discoverableResult.status === "fulfilled") {
      setDiscoverableSongs(discoverableResult.value as Song[]);
    } else {
      setDiscoveryError("Couldn't search existing Songs. Try again later.");
      setDiscoverableSongs([]);
    }
    setSearching(false);
    setHasSearched(true);
  };

  const handleStartPreview = async (result: SongWorkSearchResult) => {
    setPreviewResult(result);
    setPreviewYear(null);
    setPreviewWorkDateStart(null);
    setPreviewWorkDateEnd(null);
    setPreviewBackground(null);
    setPreviewLoading(true);

    try {
      const { work, background } = await fetchWorkPreview(result.workId);
      setPreviewYear(work?.year ?? null);
      setPreviewWorkDateStart(work?.workDateStart ?? null);
      setPreviewWorkDateEnd(work?.workDateEnd ?? null);
      setPreviewBackground(background);
    } catch {
      // Best-effort: confirm screen still works with just the search
      // result's title/writers if year/background couldn't be fetched.
    }
    setPreviewLoading(false);
  };

  const handleCancelPreview = () => {
    setPreviewResult(null);
    setPreviewYear(null);
    setPreviewWorkDateStart(null);
    setPreviewWorkDateEnd(null);
    setPreviewBackground(null);
    setPreviewLoading(false);
  };

  const createSong = async (song: {
    name: string;
    year: string | null;
    writers: WriterInput[];
    wikipediaExtract: string | null;
    wikipediaUrl: string | null;
    workId: string | null;
    workDateStart: string | null;
    workDateEnd: string | null;
  }) => {
    setErrorMessage("");

    const parsedYear = song.year ? Number(song.year) : null;
    if (
      parsedYear !== null &&
      (!Number.isInteger(parsedYear) || parsedYear < -32768 || parsedYear > 32767)
    ) {
      setErrorMessage("Year must be a whole number.");
      return;
    }

    setSaving(true);
    createRequestId.current ??= crypto.randomUUID();
    try {
      const songId = await createSongMutation({
        requestId: createRequestId.current,
        shared: {
          name: song.name,
          year: parsedYear,
          wikipediaExtract: song.wikipediaExtract,
          wikipediaUrl: song.wikipediaUrl,
          musicbrainzWorkId: song.workId,
          workDateStart: song.workDateStart,
          workDateEnd: song.workDateEnd,
        },
        writers: toConvexWriters(song.writers),
      });

      setSaving(false);
      onCreated(songId);
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        "Failed to add Song: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  const addExistingSong = async (songId: string) => {
    setErrorMessage("");
    setSaving(true);
    try {
      const addedSongId = await addDiscoverableSong({
        songId: songId as Id<"songs">,
      });
      setSaving(false);
      onCreated(addedSongId);
    } catch (error) {
      setSaving(false);
      setErrorMessage(
        "Failed to add Song: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  const handleConfirmPreview = () => {
    if (!previewResult) return;
    createSong({
      name: previewResult.title,
      year: previewYear,
      writers: writersFromResult(previewResult),
      wikipediaExtract: previewBackground?.extract ?? null,
      wikipediaUrl: previewBackground?.url ?? null,
      workId: previewResult.workId,
      workDateStart: previewWorkDateStart,
      workDateEnd: previewWorkDateEnd,
    });
  };

  const handleManualAdd = () => {
    if (!name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }
    createSong({
      name,
      year: manualYear || null,
      writers: manualWriters,
      wikipediaExtract: null,
      wikipediaUrl: null,
      workId: null,
      workDateStart: null,
      workDateEnd: null,
    });
  };

  if (previewResult) {
    const credited = creditedNames(previewResult);

    return (
      <Modal title="Add a Song" onClose={onClose}>
        {errorMessage && <p className="text-vermillion-600 mb-2">{errorMessage}</p>}

        <h3 className="font-semibold">{previewResult.title}</h3>
        {previewResult.disambiguation && (
          <p className="text-xs text-ink-600 mb-2">
            {previewResult.disambiguation}
          </p>
        )}
        <p className="text-sm text-ink-600 mb-3">
          {credited.length > 0 ? credited.join(", ") : "No writer credits found"}
        </p>

        {previewLoading ? (
          <p className="text-sm text-ink-600 mb-4">
            Looking up year and background...
          </p>
        ) : (
          <>
            <p className="text-sm mb-3">
              <span className="text-ink-600">Year: </span>
              {previewYear || "Unknown"}
            </p>

            {previewBackground ? (
              <WikipediaBackgroundCard
                extract={previewBackground.extract}
                url={previewBackground.url}
                className="p-3 rounded-md border border-paper-600 mb-4"
              />
            ) : (
              <p className="text-sm text-ink-600 mb-4">
                No Wikipedia background found.
              </p>
            )}
          </>
        )}

        <MusicBrainzLink
          type="work"
          id={previewResult.workId}
          className="block text-xs text-azure-900 underline mb-4"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancelPreview}
            disabled={saving}
            className="flex-1 border border-paper-600 p-3 rounded-lg disabled:opacity-70"
          >
            Cancel
          </button>
          <PrimaryButton
            onClick={handleConfirmPreview}
            disabled={saving || previewLoading}
            className="flex-1 p-3 disabled:opacity-70"
          >
            {saving ? "Adding..." : "Confirm"}
          </PrimaryButton>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Add a Song" onClose={onClose}>
      {errorMessage && <p className="text-vermillion-600 mb-2">{errorMessage}</p>}
      <FormField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleSearch();
          }
        }}
        autoFocus
        className="block mb-2"
        labelClassName="block text-sm mb-1"
        inputClassName="block w-full p-2 rounded-md border border-paper-600"
      />
      <PrimaryButton
        onClick={handleSearch}
        disabled={searching || !name.trim()}
        className="mb-3 px-3 py-2 disabled:opacity-70"
      >
        {searching ? "Looking up..." : "Search"}
      </PrimaryButton>

      {searchError && <p className="text-vermillion-600 mb-3">{searchError}</p>}
      {discoveryError && (
        <p className="text-vermillion-600 mb-3">{discoveryError}</p>
      )}

      {hasSearched && !searching && (
        <>
          {discoverableSongs.length > 0 && (
            <div className="mb-5">
              <h3 className="font-semibold mb-2">Already in Standards</h3>
              <ul className="divide-y divide-paper-600 rounded-md border border-paper-600">
                {discoverableSongs.map((song) => (
                  <li
                    key={song.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{song.name}</p>
                      {song.year && (
                        <p className="text-xs text-ink-600">{song.year}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addExistingSong(song.id)}
                      disabled={saving}
                      className="shrink-0 text-sm text-azure-900 underline disabled:opacity-60"
                    >
                      Add this Song
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {searchResults.length === 0 && !searchError && (
            <p className="text-sm text-ink-600 mb-3">No matches found.</p>
          )}
          <SongWorkResultsList
            results={searchResults}
            onSelect={handleStartPreview}
          />
          {!manualMode && (
            <button
              type="button"
              onClick={() => setManualMode(true)}
              className="text-sm text-azure-900 underline mb-4"
            >
              Can&apos;t find it? Add manually
            </button>
          )}
        </>
      )}

      {manualMode && (
        <>
          <SongWritersEditor value={manualWriters} onChange={setManualWriters} />

          <FormField
            label="Year"
            value={manualYear}
            onChange={(e) => setManualYear(e.target.value)}
            className="block mb-4"
            labelClassName="block text-sm mb-1"
            inputClassName="block w-full p-2 rounded-md border border-paper-600"
          />

          <PrimaryButton
            onClick={handleManualAdd}
            disabled={saving}
            className="block w-full p-3 disabled:opacity-70"
          >
            {saving ? "Adding..." : "Add Song"}
          </PrimaryButton>
        </>
      )}
    </Modal>
  );
}
