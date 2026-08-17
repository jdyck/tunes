"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  extractYouTubeID,
  YouTubeSearchResult,
} from "@/lib/youtube";
import {
  searchYoutube,
  SEARCH_PLATFORMS,
  SearchPlatformId,
} from "@/lib/youtubeSearchClient";
import { RecordingKind, SavedRecording } from "@/types/types";
import { usePlayer } from "@/components/player/GlobalPlayer";
import Modal from "@/components/ui/Modal";
import YtMusicSearchResultRow from "@/components/recording/YtMusicSearchResultRow";
import YoutubeSearchResultRow from "@/components/recording/YoutubeSearchResultRow";
import PrimaryButton from "@/components/ui/PrimaryButton";
import FormField from "@/components/ui/FormField";
import type { RecordingResultPendingState } from "@/components/recording/RecordingResultToggleButton";
import {
  deriveInitialSavedVideoState,
  markRecordingRemoved,
  markVideoSaved,
} from "@/utils/addRecordingSavedState";

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
  savedRecordings,
  onClose,
}: {
  songId: string;
  songTitle: string;
  savedRecordings: SavedRecording[];
  onClose: () => void;
}) {
  const { play } = usePlayer();
  const saveYouTubeRecording = useMutation(api.recordings.saveYoutube);
  const unsaveRecording = useMutation(api.recordings.unsave);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);
  const [initialSavedState] = useState(() =>
    deriveInitialSavedVideoState(savedRecordings)
  );
  const [savedByVideoId, setSavedByVideoId] = useState(
    initialSavedState.savedByVideoId
  );
  const [pendingByVideoId, setPendingByVideoId] = useState<
    Record<string, Exclude<RecordingResultPendingState, null>>
  >({});
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({});
  const [duplicateVideoIds, setDuplicateVideoIds] = useState(
    () => new Set(initialSavedState.duplicateVideoIds)
  );
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
    try {
      const response = await fetch(
        `/api/youtube-video?videoId=${encodeURIComponent(videoId)}`
      );
      if (!response.ok) return null;
      return (await response.json()) as VideoMetadata;
    } catch {
      return null;
    }
  };

  const saveResult = async (
    result: YouTubeSearchResult,
    kind: RecordingKind
  ) => {
    const { videoId } = result;
    if (pendingByVideoId[videoId]) return false;

    setPendingByVideoId((previous) => ({ ...previous, [videoId]: "saving" }));
    setActionErrors((previous) => ({ ...previous, [videoId]: "" }));

    try {
      let selected = result;
      if (result.discoverySource === "youtube_search") {
        const metadata = await fetchOfficialMetadata(videoId);
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

      const data = await saveYouTubeRecording({
        songId: songId as Id<"songs">,
        videoId: selected.videoId,
        title: selected.title,
        channelName: selected.channelTitle || null,
        searchCategory: selected.searchCategory,
        discoverySource: selected.discoverySource,
        recordingKind: kind,
        ytmusicArtistId: selected.artistId ?? null,
        ytmusicArtistName: selected.artistName ?? null,
        ytmusicAlbumId: selected.albumId ?? null,
        ytmusicAlbumName: selected.albumName ?? null,
        durationSeconds: selected.durationSeconds ?? null,
        metadataFetchedAt: selected.metadataFetchedAt ?? null,
      });
      if (typeof data !== "string") {
        throw new Error("The save did not return a Recording ID.");
      }

      setSavedByVideoId((previous) =>
        markVideoSaved(previous, videoId, data)
      );
      return true;
    } catch (error) {
      setActionErrors((previous) => ({
        ...previous,
        [videoId]: `Failed to add recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
      return false;
    } finally {
      setPendingByVideoId((previous) => {
        const next = { ...previous };
        delete next[videoId];
        return next;
      });
    }
  };

  const removeResult = async (videoId: string) => {
    if (pendingByVideoId[videoId]) return false;

    if (duplicateVideoIds.has(videoId)) {
      setActionErrors((previous) => ({
        ...previous,
        [videoId]:
          "More than one saved Recording uses this video. Remove it from Recording details.",
      }));
      return false;
    }

    const saved = savedByVideoId[videoId];
    if (!saved) return false;

    if (
      saved.existedAtOpen &&
      !window.confirm(
        "Remove this saved Recording? Your private notes, tags, rating, order, key, and tempo for it will be permanently deleted. Shared Recording metadata will remain."
      )
    ) {
      return false;
    }

    setPendingByVideoId((previous) => ({
      ...previous,
      [videoId]: "removing",
    }));
    setActionErrors((previous) => ({ ...previous, [videoId]: "" }));

    try {
      await unsaveRecording({
        recordingId: saved.recordingId as Id<"recordings">,
      });

      setSavedByVideoId((previous) =>
        markRecordingRemoved(previous, saved.recordingId)
      );
      return true;
    } catch (error) {
      setActionErrors((previous) => ({
        ...previous,
        [videoId]: `Failed to remove recording: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }));
      return false;
    } finally {
      setPendingByVideoId((previous) => {
        const next = { ...previous };
        delete next[videoId];
        return next;
      });
    }
  };

  const toggleResult = (
    result: YouTubeSearchResult,
    kind: RecordingKind
  ) => {
    const saved =
      duplicateVideoIds.has(result.videoId) ||
      Boolean(savedByVideoId[result.videoId]);
    return saved ? removeResult(result.videoId) : saveResult(result, kind);
  };

  const handleManualAdd = async () => {
    const videoId = extractYouTubeID(manualUrl);
    if (!videoId) {
      setErrorMessage("Enter a supported YouTube URL or 11-character video ID.");
      return;
    }

    setErrorMessage(null);
    setManualSuccess(null);

    if (duplicateVideoIds.has(videoId)) {
      setErrorMessage(
        "More than one saved Recording uses this video. Remove it from Recording details."
      );
      return;
    }

    if (savedByVideoId[videoId]) {
      const removed = await removeResult(videoId);
      if (removed) setManualSuccess("Saved Recording removed.");
      return;
    }

    const metadata = await fetchOfficialMetadata(videoId);
    const saved = await saveResult(
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
    if (saved) {
      setManualUrl("");
      setManualSuccess("Recording saved. You can add another URL.");
    }
  };

  const manualVideoId = extractYouTubeID(manualUrl);
  const manualPending = manualVideoId
    ? pendingByVideoId[manualVideoId] ?? null
    : null;

  return (
    <Modal title="Add a Recording" onClose={onClose}>
      {errorMessage && (
        <p className="text-vermillion-600 mb-2" role="alert">
          {errorMessage}
        </p>
      )}

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
                  ? "bg-azure-700 text-white border-azure-700"
                  : "bg-transparent text-ink-600 border-paper-600"
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
          inputClassName="block w-full p-2 rounded-md border border-paper-600 mb-2"
        />
        <PrimaryButton
          onClick={handleSearch}
          disabled={search.searching}
          className="mb-4 px-3 py-2"
        >
          {search.searching ? "Searching..." : "Search"}
        </PrimaryButton>
        {search.error && (
          <p className="text-sm text-vermillion-700 mb-4">
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
                saved:
                  duplicateVideoIds.has(result.videoId) ||
                  Boolean(savedByVideoId[result.videoId]),
                pending: pendingByVideoId[result.videoId] ?? null,
                actionError: actionErrors[result.videoId],
                onKindChange: (next: RecordingKind) =>
                  setSelectedKinds((previous) => ({
                    ...previous,
                    [result.videoId]: next,
                  })),
                onPlay: () =>
                  play({
                    name: result.title,
                    songTitle,
                    artist: result.channelTitle.replace(/ - Topic$/, ""),
                    youtubeVideoId: result.videoId,
                    kind,
                  }),
                onToggle: () => toggleResult(result, kind),
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

      <div className="mt-6 pt-4 border-t border-paper-600">
        <FormField
          label="Or add a YouTube URL"
          value={manualUrl}
          onChange={(event) => setManualUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          inputClassName="block w-full p-2 rounded-md border border-paper-600 my-2"
        />
        <label className="block text-sm mb-3">
          Recording kind
          <select
            value={manualKind}
            onChange={(event) => setManualKind(event.target.value as RecordingKind)}
            className="block mt-1 p-2 rounded-md border border-paper-600"
          >
            <option value="video_capture">Video capture</option>
            <option value="released">Released recording</option>
          </select>
        </label>
        <PrimaryButton
          onClick={handleManualAdd}
          disabled={
            !manualUrl.trim() || manualPending !== null
          }
          className="px-3 py-2"
        >
          {manualPending === "saving"
            ? "Adding..."
            : manualPending === "removing"
              ? "Removing..."
              : manualVideoId && savedByVideoId[manualVideoId]
                ? "Remove saved URL"
                : "Add URL"}
        </PrimaryButton>
        {manualSuccess && (
          <p className="mt-2 text-sm text-azure-700" role="status">
            {manualSuccess}
          </p>
        )}
      </div>
    </Modal>
  );
}
