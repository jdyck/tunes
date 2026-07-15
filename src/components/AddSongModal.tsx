"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tune } from "@/types/types";
import { SongWorkSearchResult } from "@/utils/musicbrainz";
import { WorkBackground } from "@/utils/wikipedia";
import { WriterInput, saveSongWriters } from "@/utils/songWriters";
import { searchSongMetadata, fetchWorkPreview } from "@/utils/songMetadataClient";
import Modal from "@/components/Modal";
import SongWritersEditor from "@/components/SongWritersEditor";
import SongWorkResultsList from "@/components/SongWorkResultsList";
import FormField from "@/components/FormField";
import MusicBrainzLink from "@/components/MusicBrainzLink";
import WikipediaBackgroundCard from "@/components/WikipediaBackgroundCard";
import PrimaryButton from "@/components/PrimaryButton";

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

    if (!name.trim()) {
      return;
    }

    setSearching(true);
    try {
      setSearchResults(await searchSongMetadata(name));
    } catch {
      setSearchError("Couldn't look up song metadata. Try again later.");
      setSearchResults([]);
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

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }

    setSaving(true);
    const tune: Partial<Tune> = {
      name: song.name,
      year: song.year,
      user_id: user.id,
      wikipedia_extract: song.wikipediaExtract,
      wikipedia_url: song.wikipediaUrl,
      musicbrainz_work_id: song.workId,
    };

    const { data, error } = await supabase
      .from("tunes")
      .insert([tune])
      .select()
      .single();

    if (error) {
      setSaving(false);
      setErrorMessage("Failed to add song: " + error.message);
      return;
    }

    try {
      await saveSongWriters(data.id, song.writers);
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
    onCreated(data.id);
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

      {hasSearched && !searching && (
        <>
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
