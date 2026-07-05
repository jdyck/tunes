"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import {
  fetchYouTubeVideoData,
  parseYouTubeMusicMetadata,
  searchYouTubeVideos,
  YouTubeSearchResult,
} from "@/utils/youtube";
import { PlusCircleIcon } from "@heroicons/react/20/solid";
import { usePlayer } from "@/components/GlobalPlayer";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export default function AddRecordingPage() {
  const params = useParams();
  const tuneId = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const { play } = usePlayer();

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<Recording["kind"]>(null);
  const [artist, setArtist] = useState("");
  const [year, setYear] = useState("");
  const [album, setAlbum] = useState("");
  const [duration, setDuration] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [tags, setTags] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const RESULTS_PAGE_SIZE = 10;

  const visibleResults = showAllResults
    ? searchResults
    : searchResults.filter((result) => result.isMusic);

  const totalPages = Math.max(
    1,
    Math.ceil(visibleResults.length / RESULTS_PAGE_SIZE)
  );
  const pagedResults = visibleResults.slice(
    currentPage * RESULTS_PAGE_SIZE,
    (currentPage + 1) * RESULTS_PAGE_SIZE
  );

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
    const { results, nextPageToken: token } = await searchYouTubeVideos(
      searchQuery,
      YOUTUBE_API_KEY
    );
    setSearchResults(results);
    setNextPageToken(token);
    setCurrentPage(0);
    setSearching(false);
  };

  const handleLoadMore = async () => {
    if (!YOUTUBE_API_KEY || !nextPageToken) {
      return;
    }

    setLoadingMore(true);
    const { results, nextPageToken: token } = await searchYouTubeVideos(
      searchQuery,
      YOUTUBE_API_KEY,
      nextPageToken
    );
    setSearchResults((prev) => {
      const byId = new Map(prev.map((result) => [result.videoId, result]));
      for (const result of results) {
        byId.set(result.videoId, result);
      }
      return Array.from(byId.values());
    });
    setNextPageToken(token);
    setLoadingMore(false);
  };

  const handleSelectResult = async (result: YouTubeSearchResult) => {
    setUrl(`https://www.youtube.com/watch?v=${result.videoId}`);
    setKind(result.isMusic ? "released" : "video_capture");
    setName(result.title);
    setArtist(result.channelTitle.replace(/ - Topic$/, ""));
    setSearchResults([]);
    setSearchQuery("");
    setNextPageToken(null);

    if (YOUTUBE_API_KEY) {
      const videoData = await fetchYouTubeVideoData(
        result.videoId,
        YOUTUBE_API_KEY
      );
      if (videoData?.duration) {
        setDuration(videoData.duration);
      }
      if (videoData?.description) {
        const { album, releaseYear } = parseYouTubeMusicMetadata(
          videoData.description
        );
        if (album) setAlbum(album);
        if (releaseYear) setYear(releaseYear);
      }
    }
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
      artist: artist || null,
      year: year || null,
      album: album || null,
      duration: duration || null,
      key: key || null,
      tempo: tempo ? parseInt(tempo, 10) : null,
      tags: tags
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : null,
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
        <>
          <label className="block mb-2">
            <input
              type="checkbox"
              checked={showAllResults}
              onChange={(e) => {
                setShowAllResults(e.target.checked);
                setCurrentPage(0);
              }}
            />{" "}
            Show all results (not just Music)
          </label>

          {visibleResults.length === 0 && (
            <p className="mb-4">
              No Music results. Check the box above to see all results.
            </p>
          )}

          <ul className="mb-4">
            {pagedResults.map((result) => (
              <li key={result.videoId} className="mb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      play({
                        name: result.title,
                        artist: result.channelTitle.replace(/ - Topic$/, ""),
                        url: `https://www.youtube.com/watch?v=${result.videoId}`,
                        kind: result.isMusic ? "released" : "video_capture",
                      })
                    }
                    className="flex-shrink-0"
                    title="Preview"
                  >
                    {result.thumbnail && (
                      <img
                        src={result.thumbnail}
                        alt=""
                        width={60}
                        height={45}
                      />
                    )}
                  </button>
                  <span>{result.isMusic ? "Music" : "Video"}</span>
                  <span className="flex-1">{result.title}</span>
                  <span style={{ color: "gray" }}>{result.channelTitle}</span>
                  <button
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    title="Use this result"
                  >
                    <PlusCircleIcon className="h-6 w-6 text-green-600" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages - 1, page + 1))
                }
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </button>
            </div>
          )}

          {nextPageToken && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mb-4 bg-slate-700 text-white px-3 py-2 rounded-lg"
            >
              {loadingMore ? "Loading..." : "Load next 50 results"}
            </button>
          )}
        </>
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
          Artist
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Album
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={album}
            onChange={(e) => setAlbum(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Year
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Duration
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Key
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Tempo (BPM)
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="number"
            value={tempo}
            onChange={(e) => setTempo(e.target.value)}
          />
        </label>
      </div>
      <div>
        <label>
          Tags (comma separated)
          <input
            className="block w-full p-2 rounded-md mb-4"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
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
