"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Tune } from "@/types/types";
import { SongWorkSearchResult } from "@/utils/musicbrainz";
import { WriterInput, saveSongWriters } from "@/utils/songWriters";
import { PlusCircleIcon } from "@heroicons/react/20/solid";
import Modal from "@/components/Modal";
import SongWritersEditor from "@/components/SongWritersEditor";

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

  const handleSearch = async () => {
    setSearchError(null);

    if (!name.trim()) {
      return;
    }

    setSearching(true);
    try {
      const response = await fetch(
        `/api/song-metadata/search?q=${encodeURIComponent(name)}`
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setSearchResults(data.results || []);
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

    try {
      const response = await fetch(`/api/song-metadata/work/${result.workId}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.year) setYear(data.year);
    } catch {
      // Year is best-effort; leave it blank for hand entry on failure.
    }
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

      {searchResults.length > 0 && (
        <ul className="mb-4">
          {searchResults.map((result) => (
            <li key={result.workId} className="mb-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    {result.title}
                    {result.disambiguation && (
                      <span className="text-ink-600">
                        {" "}
                        ({result.disambiguation})
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-600">
                    {result.composers.length > 0 || result.lyricists.length > 0
                      ? [
                          result.composers.length > 0 &&
                            `Composer: ${result.composers.join(", ")}`,
                          result.lyricists.length > 0 &&
                            `Lyricist: ${result.lyricists.join(", ")}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : result.writers.length > 0
                        ? `Written by: ${result.writers.join(", ")}`
                        : "No writer credits found"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  title="Use this match"
                >
                  <PlusCircleIcon className="h-6 w-6 text-green-600" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

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
