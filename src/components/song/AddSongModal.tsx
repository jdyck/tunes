"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Song } from "@/types/types";
import { SongWorkSearchResult } from "@/lib/musicbrainz";
import { WorkBackground } from "@/lib/wikipedia";
import { WriterInput, saveSongWriters } from "@/lib/songWriters";
import { searchSongMetadata, fetchWorkPreview } from "@/lib/songMetadataClient";
import Modal from "@/components/ui/Modal";
import SongWritersEditor from "@/components/song/SongWritersEditor";
import SongWorkResultsList from "@/components/song/SongWorkResultsList";
import FormField from "@/components/ui/FormField";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import WikipediaBackgroundCard from "@/components/song/WikipediaBackgroundCard";
import PrimaryButton from "@/components/ui/PrimaryButton";

const creditedNames = (result: SongWorkSearchResult): string[] =>
  Array.from(new Set([...result.composers, ...result.lyricists, ...result.writers]));

const writersFromResult = (result: SongWorkSearchResult): WriterInput[] => [
  ...result.composers.map((name) => ({ name, role: "composer" as const })),
  ...result.lyricists.map((name) => ({ name, role: "lyricist" as const })),
  ...result.writers.map((name) => ({ name, role: "writer" as const })),
];

export default function AddSongModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
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
      (async () => {
        const { data, error } = await supabase
          .from("songs")
          .select(
            "id, name, year, wikipedia_extract, wikipedia_url, musicbrainz_work_id, is_discoverable, first_discoverable_at, song_writers(role, sort_order, people(name))"
          )
          .eq("is_discoverable", true)
          .ilike("name", `%${name.trim()}%`)
          .limit(10);
        if (error) throw error;

        const matches = (data ?? []) as unknown as Song[];
        if (matches.length === 0) return [];

        const { data: memberships, error: membershipsError } = await supabase
          .from("song_user_data")
          .select("song_id")
          .in(
            "song_id",
            matches.map((song) => song.id)
          );
        if (membershipsError) throw membershipsError;

        const savedIds = new Set((memberships ?? []).map((row) => row.song_id));
        return matches.filter((song) => !savedIds.has(song.id));
      })(),
    ]);

    if (metadataResult.status === "fulfilled") {
      setSearchResults(metadataResult.value);
    } else {
      setSearchError("Couldn't look up song metadata. Try again later.");
      setSearchResults([]);
    }

    if (discoverableResult.status === "fulfilled") {
      setDiscoverableSongs(discoverableResult.value);
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
    setPreviewBackground(null);
    setPreviewLoading(true);

    try {
      const { work, background } = await fetchWorkPreview(result.workId);
      setPreviewYear(work?.year ?? null);
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
    const { data, error } = await supabase.rpc("create_song_with_membership", {
      p_song_id: createRequestId.current,
      p_name: song.name,
      p_year: parsedYear,
      p_wikipedia_extract: song.wikipediaExtract,
      p_wikipedia_url: song.wikipediaUrl,
      p_musicbrainz_work_id: song.workId,
    });

    if (error) {
      setSaving(false);
      setErrorMessage("Failed to add song: " + error.message);
      return;
    }

    try {
      await saveSongWriters(data, song.writers);
    } catch (writersError) {
      setSaving(false);
      setErrorMessage(
        "Song was added, but saving writers failed: " +
          (writersError instanceof Error
            ? writersError.message
            : String(writersError))
      );
      return;
    }

    setSaving(false);
    onCreated(data);
  };

  const addExistingSong = async (songId: string) => {
    setErrorMessage("");
    setSaving(true);
    const { data, error } = await supabase.rpc("add_discoverable_song", {
      p_song_id: songId,
    });
    setSaving(false);

    if (error) {
      setErrorMessage("Failed to add Song: " + error.message);
      return;
    }

    onCreated(data);
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
    });
  };

  if (previewResult) {
    const credited = creditedNames(previewResult);

    return (
      <Modal title="Add a Song" onClose={onClose}>
        {errorMessage && <p className="text-mojo-600 mb-2">{errorMessage}</p>}

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
                className="p-3 rounded-md border border-line-200 mb-4"
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
          className="block text-xs text-teal-700 underline mb-4"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCancelPreview}
            disabled={saving}
            className="flex-1 border border-line-200 p-3 rounded-lg disabled:opacity-70"
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
      {errorMessage && <p className="text-mojo-600 mb-2">{errorMessage}</p>}
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
        inputClassName="block w-full p-2 rounded-md border border-line-200"
      />
      <PrimaryButton
        onClick={handleSearch}
        disabled={searching || !name.trim()}
        className="mb-3 px-3 py-2 disabled:opacity-70"
      >
        {searching ? "Looking up..." : "Search"}
      </PrimaryButton>

      {searchError && <p className="text-mojo-600 mb-3">{searchError}</p>}
      {discoveryError && (
        <p className="text-mojo-600 mb-3">{discoveryError}</p>
      )}

      {hasSearched && !searching && (
        <>
          {discoverableSongs.length > 0 && (
            <div className="mb-5">
              <h3 className="font-semibold mb-2">Already in Standards</h3>
              <ul className="divide-y divide-line-200 rounded-md border border-line-200">
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
                      className="shrink-0 text-sm text-teal-700 underline disabled:opacity-60"
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
              className="text-sm text-teal-700 underline mb-4"
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
            inputClassName="block w-full p-2 rounded-md border border-line-200"
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
