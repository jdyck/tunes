"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import { searchYouTubeVideos, YouTubeSearchResult } from "@/utils/youtube";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function AddRecordingPage() {
  const params = useParams();
  const tuneId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<Recording["kind"]>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    setSearchError(null);

    if (!searchQuery.trim()) {
      return;
    }
    if (!YOUTUBE_API_KEY) {
      setSearchError("YouTube search is not configured.");
      return;
    }

    setSearching(true);
    const results = await searchYouTubeVideos(searchQuery, YOUTUBE_API_KEY);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSelectResult = (result: YouTubeSearchResult) => {
    setUrl(`https://www.youtube.com/watch?v=${result.videoId}`);
    setKind(result.isMusic ? "released" : "video_capture");
    setName(result.title);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleAddRecording = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      setErrorMessage("User not authenticated.");
      return;
    }

    const userId = sessionData.session.user.id;

    if (!tuneId) {
      setErrorMessage("Invalid tune ID.");
      return;
    }

    const newRecording: Omit<Recording, "id"> = {
      tune_id: tuneId,
      user_id: userId,
      name,
      notes: notes || null,
      url: url || null,
      kind,
    };

    const { error } = await supabase.from("recordings").insert(newRecording);

    if (error) {
      setErrorMessage("Failed to add recording: " + error.message);
    } else {
      setSuccessMessage("Recording added successfully!");
      setTimeout(() => router.push(`/tune/${tuneId}`), 1500);
    }
  };

  return (
    <div className="w-full">
      <h1>Add a New Recording</h1>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <div className="w-full">
        <label>
          Search YouTube
          <input
            className="block w-full p-2 rounded-md mb-2"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
          />
        </label>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="mb-4 bg-slate-700 text-white px-3 py-2 rounded-lg"
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </div>

      {searchError && <p style={{ color: "red" }}>{searchError}</p>}

      {searchResults.length > 0 && (
        <ul className="mb-4">
          {searchResults.map((result) => (
            <li
              key={result.videoId}
              onClick={() => handleSelectResult(result)}
              className="flex items-center gap-2 mb-2 cursor-pointer"
            >
              {result.thumbnail && (
                <img src={result.thumbnail} alt="" width={60} height={45} />
              )}
              <span>{result.isMusic ? "Music" : "Video"}</span>
              <span>{result.title}</span>
              <span style={{ color: "gray" }}>{result.channelTitle}</span>
            </li>
          ))}
        </ul>
      )}

      {kind && (
        <p className="mb-4">
          Selected match: {kind === "released" ? "Music" : "Video"}
        </p>
      )}

      <div className="w-full">
        <label>
          Name
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      </div>
      <div>
        <label>
          Notes
          <textarea
            className="block w-full p-2 rounded-md mb-4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          URL (or paste a link directly)
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setKind(null);
            }}
          />
        </label>
      </div>

      <button
        onClick={handleAddRecording}
        className="block mb-4 bg-slate-700 text-white w-full p-3 rounded-lg"
      >
        Add Recording
      </button>
      <button onClick={() => router.back()}>Cancel</button>
    </div>
  );
}
