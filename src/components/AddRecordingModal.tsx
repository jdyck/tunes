"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Recording } from "@/types/types";
import {
  fetchYouTubeVideoData,
  parseYouTubeMusicMetadata,
  YouTubeSearchResult,
} from "@/utils/youtube";
import {
  searchYoutube,
  SEARCH_PLATFORMS,
  SearchPlatformId,
} from "@/utils/youtubeSearchClient";
import { usePlayer } from "@/components/GlobalPlayer";
import Modal from "@/components/Modal";
import YtMusicSearchResultRow from "@/components/YtMusicSearchResultRow";
import YoutubeSearchResultRow from "@/components/YoutubeSearchResultRow";
import PrimaryButton from "@/components/PrimaryButton";
import FormField from "@/components/FormField";
import AddRecordingMatchSuggestion from "@/components/AddRecordingMatchSuggestion";
import { RecordingMatchResult } from "@/utils/musicbrainz";
import { searchRecordingMetadata } from "@/utils/recordingMetadataClient";

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

interface PlatformSearchState {
  query: string;
  results: YouTubeSearchResult[];
  searching: boolean;
  error: string | null;
  nextPageToken: string | null;
  loadingMore: boolean;
}

const emptyPlatformState = (query: string): PlatformSearchState => ({
  query,
  results: [],
  searching: false,
  error: null,
  nextPageToken: null,
  loadingMore: false,
});

interface ResolvedFields {
  kind: Recording["kind"];
  url: string;
  artist: string;
  album: string | null;
  duration: string | null;
  year: string | null;
  notes: string | null;
}

export default function AddRecordingModal({
  tuneId,
  tuneTitle,
  onClose,
  onAdded,
}: {
  tuneId: string;
  tuneTitle: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { play } = usePlayer();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);
  const [pendingMatch, setPendingMatch] = useState<{
    result: YouTubeSearchResult;
    fields: ResolvedFields;
    match: RecordingMatchResult;
  } | null>(null);

  const [activePlatform, setActivePlatform] =
    useState<SearchPlatformId>("ytmusic");
  const [platformStates, setPlatformStates] = useState<
    Record<SearchPlatformId, PlatformSearchState>
  >(() => ({
    ytmusic: emptyPlatformState(`${tuneTitle} `),
    youtube: emptyPlatformState(""),
  }));
  const [currentPage, setCurrentPage] = useState(0);

  const search = platformStates[activePlatform];

  const updatePlatform = (
    id: SearchPlatformId,
    patch: Partial<PlatformSearchState>
  ) => {
    setPlatformStates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
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
    if (!query.trim()) {
      return;
    }

    updatePlatform(id, { searching: true, error: null });
    try {
      const { results, nextPageToken } = await searchYoutube(query, id);
      updatePlatform(id, { results, nextPageToken, searching: false });
      setCurrentPage(0);
    } catch (error) {
      updatePlatform(id, {
        searching: false,
        error:
          error instanceof Error ? error.message : "YouTube search failed.",
      });
    }
  };

  const handleLoadMore = async () => {
    const id = activePlatform;
    const { query, nextPageToken } = platformStates[id];
    if (!nextPageToken) {
      return;
    }

    updatePlatform(id, { loadingMore: true });
    try {
      const { results, nextPageToken: token } = await searchYoutube(
        query,
        id,
        nextPageToken
      );
      setPlatformStates((prev) => {
        const byId = new Map(
          prev[id].results.map((result) => [result.videoId, result])
        );
        for (const result of results) {
          byId.set(result.videoId, result);
        }
        return {
          ...prev,
          [id]: {
            ...prev[id],
            results: Array.from(byId.values()),
            nextPageToken: token,
            loadingMore: false,
          },
        };
      });
    } catch (error) {
      updatePlatform(id, {
        loadingMore: false,
        error:
          error instanceof Error ? error.message : "YouTube search failed.",
      });
    }
  };

  const insertRecording = async (
    newRecording: Omit<Recording, "id" | "user_id">
  ) => {
    setErrorMessage(null);

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      setErrorMessage("User not authenticated.");
      return false;
    }

    const { error } = await supabase.from("recordings").insert({
      ...newRecording,
      user_id: sessionData.session.user.id,
    });

    if (error) {
      setErrorMessage("Failed to add recording: " + error.message);
      return false;
    }

    return true;
  };

  const resolveFields = async (
    result: YouTubeSearchResult
  ): Promise<ResolvedFields> => {
    const kind: Recording["kind"] = result.isMusic
      ? "released"
      : "video_capture";
    const url = `https://www.youtube.com/watch?v=${result.videoId}`;

    let album = result.album ?? null;
    let duration = result.duration ?? null;
    let year: string | null = null;
    let notes: string | null = null;

    if (activePlatform === "youtube" && YOUTUBE_API_KEY) {
      const videoData = await fetchYouTubeVideoData(
        result.videoId,
        YOUTUBE_API_KEY
      );
      if (videoData?.duration) duration = videoData.duration;
      if (videoData?.description) {
        notes = videoData.description;
        const parsed = parseYouTubeMusicMetadata(videoData.description);
        if (parsed.album) album = parsed.album;
        if (parsed.releaseYear) year = parsed.releaseYear;
      }
    }

    return {
      kind,
      url,
      artist: result.channelTitle.replace(/ - Topic$/, ""),
      album,
      duration,
      year,
      notes,
    };
  };

  // Selecting a result resolves its YouTube metadata first, then checks
  // MusicBrainz for a likely match using that metadata (title/artist/
  // duration/album) -- surfacing the same duration+album+year ranking used
  // on an existing recording's "Change match", but before anything is
  // written, so a compilation/reissue album never gets persisted only to be
  // fixed later. Falls straight through to a plain insert when nothing
  // comes back, so the common case stays a single click.
  const handleSelectResult = async (result: YouTubeSearchResult) => {
    setAddingVideoId(result.videoId);
    const fields = await resolveFields(result);

    let match: RecordingMatchResult | null = null;
    try {
      const matches = await searchRecordingMetadata(
        result.title,
        fields.artist,
        fields.duration,
        fields.album
      );
      match = matches[0] ?? null;
    } catch {
      match = null;
    }

    if (match) {
      setAddingVideoId(null);
      setPendingMatch({ result, fields, match });
      return;
    }

    const ok = await insertRecording({
      tune_id: tuneId,
      name: result.title,
      notes: fields.notes,
      url: fields.url,
      kind: fields.kind,
      artist: fields.artist,
      year: fields.year,
      album: fields.album,
      duration: fields.duration,
      key: null,
      tempo: null,
      tags: null,
    });

    setAddingVideoId(null);
    if (ok) onAdded();
  };

  const handleConfirmMatch = async () => {
    if (!pendingMatch) return;
    const { fields, match } = pendingMatch;
    setAddingVideoId(pendingMatch.result.videoId);
    setPendingMatch(null);

    const ok = await insertRecording({
      tune_id: tuneId,
      name: match.title || pendingMatch.result.title,
      notes: fields.notes,
      url: fields.url,
      kind: fields.kind,
      artist: match.artistCredit || fields.artist,
      year: match.year || fields.year,
      album: match.album || fields.album,
      duration: match.duration || fields.duration,
      key: null,
      tempo: null,
      tags: null,
      musicbrainz_recording_id: match.recordingId,
      musicbrainz_release_id: match.albumReleaseId,
    });

    setAddingVideoId(null);
    if (ok) onAdded();
  };

  const handleAddWithoutMatch = async () => {
    if (!pendingMatch) return;
    const { result, fields } = pendingMatch;
    setAddingVideoId(result.videoId);
    setPendingMatch(null);

    const ok = await insertRecording({
      tune_id: tuneId,
      name: result.title,
      notes: fields.notes,
      url: fields.url,
      kind: fields.kind,
      artist: fields.artist,
      year: fields.year,
      album: fields.album,
      duration: fields.duration,
      key: null,
      tempo: null,
      tags: null,
    });

    setAddingVideoId(null);
    if (ok) onAdded();
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
          label={`Search ${SEARCH_PLATFORMS.find((p) => p.id === activePlatform)?.label ?? ""}`}
          value={search.query}
          onChange={(e) =>
            updatePlatform(activePlatform, { query: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          inputClassName="block w-full p-2 rounded-md border border-line-200 mb-2"
        />
        <div className="flex items-center gap-2 mb-4">
          <PrimaryButton onClick={handleSearch} disabled={search.searching} className="px-3 py-2">
            {search.searching ? "Searching..." : "Search"}
          </PrimaryButton>
        </div>
        {search.error && (
          <p className="text-sm text-amber-700 mb-4">
            {activePlatform === "ytmusic"
              ? "YouTube Music search isn't working right now. Try the YouTube tab above instead."
              : search.error}
          </p>
        )}
      </div>

      {search.results.length > 0 && (
        <>
          <ul className="mb-4">
            {pagedResults.map((result) => {
              if (pendingMatch?.result.videoId === result.videoId) {
                return (
                  <li key={result.videoId} className="mb-2">
                    <AddRecordingMatchSuggestion
                      match={pendingMatch.match}
                      onConfirm={handleConfirmMatch}
                      onSkip={handleAddWithoutMatch}
                      onCancel={() => setPendingMatch(null)}
                    />
                  </li>
                );
              }

              const rowProps = {
                result,
                adding: addingVideoId === result.videoId,
                onPlay: () =>
                  play({
                    name: result.title,
                    artist: result.channelTitle.replace(/ - Topic$/, ""),
                    url: `https://www.youtube.com/watch?v=${result.videoId}`,
                    kind: result.isMusic ? "released" : "video_capture",
                  }),
                onAdd: () => handleSelectResult(result),
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
    </Modal>
  );
}
