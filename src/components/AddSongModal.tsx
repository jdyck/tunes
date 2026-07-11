"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tune } from "@/types/types";
import { SongWorkSearchResult } from "@/utils/musicbrainz";
import { WriterInput, saveSongWriters } from "@/utils/songWriters";
import {
  searchSongMetadata,
  fetchWorkDetail,
  fetchWorkBackground,
} from "@/utils/songMetadataClient";
import { XMarkIcon } from "@heroicons/react/20/solid";
import Modal from "@/components/Modal";
import SongWritersEditor from "@/components/SongWritersEditor";
import SongWorkResultsList from "@/components/SongWorkResultsList";

export default function AddSongModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [writers, setWriters] = useState<WriterInput[]>([]);
  const [year, setYear] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [searchResults, setSearchResults] = useState<SongWorkSearchResult[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [wikipediaExtract, setWikipediaExtract] = useState<string | null>(null);
  const [wikipediaUrl, setWikipediaUrl] = useState<string | null>(null);
  const [lookingUpBackground, setLookingUpBackground] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);

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
  };

  const handleSelectResult = async (result: SongWorkSearchResult) => {
    setName(result.title);
    setWriters([
      ...result.composers.map((name) => ({ name, role: "composer" as const })),
      ...result.lyricists.map((name) => ({ name, role: "lyricist" as const })),
      ...result.writers.map((name) => ({ name, role: "writer" as const })),
    ]);
    setSearchResults([]);
    setSelectedWorkId(result.workId);
    setWikipediaExtract(null);
    setWikipediaUrl(null);

    const workDetail = await fetchWorkDetail(result.workId);
    if (workDetail?.year) setYear(workDetail.year);
  };

  const handleLookUpBackground = async () => {
    if (!selectedWorkId) return;

    setBackgroundError(null);
    setLookingUpBackground(true);
    const background = await fetchWorkBackground(selectedWorkId);
    setLookingUpBackground(false);

    if (!background) {
      setWikipediaExtract(null);
      setWikipediaUrl(null);
      setBackgroundError("No Wikipedia background found for this song.");
      return;
    }

    setWikipediaExtract(background.extract);
    setWikipediaUrl(background.url);
  };

  const handleAdd = async () => {
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;
    if (!user) {
      setErrorMessage("User not logged in.");
      return;
    }

    setSaving(true);
    const tune: Partial<Tune> = {
      name,
      year: year || null,
      user_id: user.id,
      wikipedia_extract: wikipediaExtract,
      wikipedia_url: wikipediaUrl,
      musicbrainz_work_id: selectedWorkId,
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
      await saveSongWriters(data.id, writers);
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

  return (
    <Modal title="Add a Song" onClose={onClose}>
      {errorMessage && <p className="text-red-600 mb-2">{errorMessage}</p>}
      <label className="block mb-2">
        <span className="block text-sm mb-1">Name</span>
        <input
          className="block w-full p-2 rounded-md border border-line-200"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          autoFocus
        />
      </label>
      <button
        type="button"
        onClick={handleSearch}
        disabled={searching || !name.trim()}
        className="mb-3 bg-slate-700 text-white px-3 py-2 rounded-lg disabled:opacity-70"
      >
        {searching ? "Looking up..." : "Look up composer/lyricist"}
      </button>

      {searchError && <p className="text-red-600 mb-3">{searchError}</p>}

      <SongWorkResultsList results={searchResults} onSelect={handleSelectResult} />

      <SongWritersEditor value={writers} onChange={setWriters} />

      <label className="block mb-4">
        <span className="block text-sm mb-1">Year</span>
        <input
          className="block w-full p-2 rounded-md border border-line-200"
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </label>

      {selectedWorkId && (
        <div className="mb-4">
          <a
            href={`https://musicbrainz.org/work/${selectedWorkId}`}
            target="_blank"
            rel="noreferrer"
            className="block text-xs text-teal-700 underline mb-1"
          >
            View on MusicBrainz
          </a>
          {wikipediaExtract ? (
            <div className="p-3 rounded-md border border-line-200">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm">{wikipediaExtract}</p>
                <button
                  type="button"
                  onClick={() => {
                    setWikipediaExtract(null);
                    setWikipediaUrl(null);
                  }}
                  aria-label="Remove background"
                  className="shrink-0"
                >
                  <XMarkIcon className="h-5 w-5 text-ink-600" />
                </button>
              </div>
              {wikipediaUrl && (
                <a
                  href={wikipediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-700 underline"
                >
                  via Wikipedia, CC BY-SA
                </a>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLookUpBackground}
                disabled={lookingUpBackground}
                className="text-sm text-teal-700 underline disabled:opacity-70"
              >
                {lookingUpBackground ? "Looking up..." : "Look up background"}
              </button>
              {backgroundError && (
                <p className="text-sm text-ink-600 mt-1">{backgroundError}</p>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={handleAdd}
        disabled={saving}
        className="block w-full bg-slate-700 text-white p-3 rounded-lg disabled:opacity-70"
      >
        {saving ? "Adding..." : "Add Song"}
      </button>
    </Modal>
  );
}
