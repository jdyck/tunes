"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  extractYouTubeID,
  YouTubeSearchResult,
} from "@/lib/youtube";
import {
  searchYoutube,
  SEARCH_PLATFORMS,
  SearchPlatformId,
} from "@/lib/youtubeSearchClient";
import { RecordingKind } from "@/types/types";
import { usePlayer } from "@/components/player/GlobalPlayer";
import Modal from "@/components/ui/Modal";
import YtMusicSearchResultRow from "@/components/recording/YtMusicSearchResultRow";
import YoutubeSearchResultRow from "@/components/recording/YoutubeSearchResultRow";
import PrimaryButton from "@/components/ui/PrimaryButton";
import FormField from "@/components/ui/FormField";

interface PlatformSearchState {
  query: string;
  results: YouTubeSearchResult[];
  searching: boolean;
  error: string | null;
  nextPageToken: string | null;
  loadingMore: boolean;
}

interface VideoMetadata {
  title: string;
  channelTitle: string;
  durationSeconds: number | null;
  metadataFetchedAt: string;
}

const emptyPlatformState = (query: string): PlatformSearchState => ({
  query,
  results: [],
  searching: false,
  error: null,
  nextPageToken: null,
  loadingMore: false,
});

const defaultKind = (result: YouTubeSearchResult): RecordingKind =>
  result.searchCategory === "song" ? "released" : "video_capture";

export default function AddRecordingModal({
  songId,
  songTitle,
  onClose,
  onAdded,
}: {
  songId: string;
  songTitle: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { play } = usePlayer();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);
  const [selectedKinds, setSelectedKinds] = useState<
    Record<string, RecordingKind>
  >({});
  const [manualUrl, setManualUrl] = useState("");
  const [manualKind, setManualKind] =
    useState<RecordingKind>("video_capture");

  const [activePlatform, setActivePlatform] =
    useState<SearchPlatformId>("ytmusic");
  const [platformStates, setPlatformStates] = useState<
    Record<SearchPlatformId, PlatformSearchState>
  >(() => ({
    ytmusic: emptyPlatformState(`${songTitle} `),
    youtube: emptyPlatformState(""),
  }));
  const [currentPage, setCurrentPage] = useState(0);
  const search = platformStates[activePlatform];

  const updatePlatform = (
    id: SearchPlatformId,
    patch: Partial<PlatformSearchState>
  ) => {
    setPlatformStates((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...patch },
    }));
  };

  const RESULTS_PAGE_SIZE = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(search.results.length / RESULTS_PAGE_SIZE)
  );
  const pagedResults = search.results.slice(
    currentPage * RESULTS_PAGE_SIZE,
    (currentPage + 1) * RESULTS_PAGE_SIZE
  );

  const handleSelectPlatform = (id: SearchPlatformId) => {
    if (id === activePlatform) return;
    if (id === "youtube" && !platformStates.youtube.query.trim()) {
      updatePlatform("youtube", { query: platformStates.ytmusic.query });
    }
    setActivePlatform(id);
    setCurrentPage(0);
  };

  const handleSearch = async () => {
    const id = activePlatform;
    const query = platformStates[id].query;
    if (!query.trim()) return;

    updatePlatform(id, { searching: true, error: null });
    try {
      const { results, nextPageToken } = await searchYoutube(query, id);
      updatePlatform(id, { results, nextPageToken, searching: false });
      setCurrentPage(0);
    } catch (error) {
      updatePlatform(id, {
        searching: false,
        error: error instanceof Error ? error.message : "YouTube search failed.",
      });
    }
  };

  const handleLoadMore = async () => {
    const id = activePlatform;
    const { query, nextPageToken } = platformStates[id];
    if (!nextPageToken) return;

    updatePlatform(id, { loadingMore: true });
    try {
      const { results, nextPageToken: token } = await searchYoutube(
        query,
        id,
        nextPageToken
      );
      setPlatformStates((previous) => {
        const byId = new Map(
          previous[id].results.map((result) => [result.videoId, result])
        );
        results.forEach((result) => byId.set(result.videoId, result));
        return {
          ...previous,
          [id]: {
            ...previous[id],
            results: Array.from(byId.values()),
            nextPageToken: token,
            loadingMore: false,
          },
        };
      });
    } catch (error) {
      updatePlatform(id, {
        loadingMore: false,
        error: error instanceof Error ? error.message : "YouTube search failed.",
      });
    }
  };

  const fetchOfficialMetadata = async (videoId: string) => {
    const response = await fetch(
      `/api/youtube-video?videoId=${encodeURIComponent(videoId)}`
    );
    if (!response.ok) return null;
    return (await response.json()) as VideoMetadata;
  };

  const saveResult = async (
    result: YouTubeSearchResult,
    kind: RecordingKind
  ) => {
    setAddingVideoId(result.videoId);
    setErrorMessage(null);

    let selected = result;
    if (result.discoverySource === "youtube_search") {
      const metadata = await fetchOfficialMetadata(result.videoId);
      if (metadata) {
        selected = {
          ...result,
          title: metadata.title || result.title,
          channelTitle: metadata.channelTitle || result.channelTitle,
          durationSeconds:
            metadata.durationSeconds ?? result.durationSeconds ?? null,
          metadataFetchedAt: metadata.metadataFetchedAt,
        };
      }
    }

    const { error } = await supabase.rpc("save_youtube_recording", {
      p_song_id: songId,
      p_video_id: selected.videoId,
      p_title: selected.title,
      p_channel_name: selected.channelTitle,
      p_search_category: selected.searchCategory,
      p_discovery_source: selected.discoverySource,
      p_recording_kind: kind,
      p_ytmusic_artist_id: selected.artistId ?? null,
      p_ytmusic_artist_name: selected.artistName ?? null,
      p_ytmusic_album_id: selected.albumId ?? null,
      p_ytmusic_album_name: selected.albumName ?? null,
      p_duration_seconds: selected.durationSeconds ?? null,
      p_metadata_fetched_at: selected.metadataFetchedAt ?? null,
    });

    setAddingVideoId(null);
    if (error) {
      setErrorMessage(`Failed to add recording: ${error.message}`);
      return;
    }
    onAdded();
  };

  const handleManualAdd = async () => {
    const videoId = extractYouTubeID(manualUrl);
    if (!videoId) {
      setErrorMessage("Enter a supported YouTube URL or 11-character video ID.");
      return;
    }

    const metadata = await fetchOfficialMetadata(videoId);
    await saveResult(
      {
        videoId,
        title: metadata?.title || `YouTube video ${videoId}`,
        channelTitle: metadata?.channelTitle || "",
        thumbnail: "",
        searchCategory: "video",
        discoverySource: "manual_url",
        durationSeconds: metadata?.durationSeconds ?? null,
        metadataFetchedAt: metadata?.metadataFetchedAt ?? null,
      },
      manualKind
    );
  };

  return (
    <Modal title="Add a Recording" onClose={onClose}>
      {errorMessage && <p className="text-mojo-600 mb-2">{errorMessage}</p>}

      <div className="w-full">
        <div className="flex gap-1 mb-2" role="tablist" aria-label="Search platform">
          {SEARCH_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              type="button"
              role="tab"
              aria-selected={activePlatform === platform.id}
              onClick={() => handleSelectPlatform(platform.id)}
              className={`px-3 py-1 rounded-full text-sm border ${
                activePlatform === platform.id
                  ? "bg-slate-700 text-white border-slate-700"
                  : "bg-transparent text-ink-600 border-line-200"
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>
        <FormField
          label={`Search ${SEARCH_PLATFORMS.find((platform) => platform.id === activePlatform)?.label ?? ""}`}
          value={search.query}
          onChange={(event) =>
            updatePlatform(activePlatform, { query: event.target.value })
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSearch();
            }
          }}
          inputClassName="block w-full p-2 rounded-md border border-line-200 mb-2"
        />
        <PrimaryButton
          onClick={handleSearch}
          disabled={search.searching}
          className="mb-4 px-3 py-2"
        >
          {search.searching ? "Searching..." : "Search"}
        </PrimaryButton>
        {search.error && (
          <p className="text-sm text-amber-700 mb-4">
            {activePlatform === "ytmusic"
              ? "YouTube Music search isn't working right now. Try the YouTube tab instead."
              : search.error}
          </p>
        )}
      </div>

      {search.results.length > 0 && (
        <>
          <ul className="mb-4">
            {pagedResults.map((result) => {
              const kind = selectedKinds[result.videoId] ?? defaultKind(result);
              const rowProps = {
                result,
                kind,
                adding: addingVideoId === result.videoId,
                onKindChange: (next: RecordingKind) =>
                  setSelectedKinds((previous) => ({
                    ...previous,
                    [result.videoId]: next,
                  })),
                onPlay: () =>
                  play({
                    name: result.title,
                    artist: result.channelTitle.replace(/ - Topic$/, ""),
                    youtubeVideoId: result.videoId,
                    kind,
                  }),
                onAdd: () => saveResult(result, kind),
              };
              return activePlatform === "ytmusic" ? (
                <YtMusicSearchResultRow key={result.videoId} {...rowProps} />
              ) : (
                <YoutubeSearchResultRow key={result.videoId} {...rowProps} />
              );
            })}
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
              <span>Page {currentPage + 1} of {totalPages}</span>
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

          {search.nextPageToken && (
            <PrimaryButton
              onClick={handleLoadMore}
              disabled={search.loadingMore}
              className="mb-4 px-3 py-2"
            >
              {search.loadingMore ? "Loading..." : "Load next 50 results"}
            </PrimaryButton>
          )}
        </>
      )}

      <div className="mt-6 pt-4 border-t border-line-200">
        <FormField
          label="Or add a YouTube URL"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          inputClassName="block w-full p-2 rounded-md border border-line-200 my-2"
        />
        <label className="block text-sm mb-3">
          Recording kind
          <select
            value={manualKind}
            onChange={(event) => setManualKind(event.target.value as RecordingKind)}
            className="block mt-1 p-2 rounded-md border border-line-200"
          >
            <option value="video_capture">Video capture</option>
            <option value="released">Released recording</option>
          </select>
        </label>
        <PrimaryButton
          onClick={handleManualAdd}
          disabled={addingVideoId !== null || !manualUrl.trim()}
          className="px-3 py-2"
        >
          {addingVideoId ? "Adding..." : "Add URL"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
