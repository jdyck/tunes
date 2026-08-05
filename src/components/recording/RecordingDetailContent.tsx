"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PlayIcon } from "@heroicons/react/20/solid";
import { usePlayer } from "@/components/player/GlobalPlayer";
import PaneHeader from "@/components/layout/PaneHeader";
import LinkButton from "@/components/ui/LinkButton";
import type {
  RecordingCandidate,
  RecordingPerformer,
  ResolvedRecordingMatch,
} from "@/lib/musicbrainz";
import {
  coverArtUrl,
  fetchRecordingDetail,
  releaseGroupCoverArtUrl,
  searchRecordingMetadata,
} from "@/lib/recordingMetadataClient";
import RecordingMatchSuggestion from "@/components/recording/RecordingMatchSuggestion";
import RecordingMatchResultsList from "@/components/recording/RecordingMatchResultsList";
import RecordingThumbnail from "@/components/recording/RecordingThumbnail";
import SaveStatusButton from "@/components/ui/SaveStatusButton";
import FormField from "@/components/ui/FormField";
import NotesField from "@/components/ui/NotesField";
import MusicBrainzLink from "@/components/ui/MusicBrainzLink";
import SyncFromMusicBrainzButton from "@/components/ui/SyncFromMusicBrainzButton";
import DeleteButton from "@/components/ui/DeleteButton";
import AsyncStateMessage from "@/components/ui/AsyncStateMessage";
import { useFieldChange } from "@/hooks/useFieldChange";
import { useSavedRecording } from "@/hooks/useSavedRecording";
import { RecordingKind } from "@/types/types";
import {
  mapSongUserDataRow,
  songWithUserDataSelect,
} from "@/lib/songs";
import { effectiveSongTitle } from "@/utils/songTitle";
import { decodeHtmlEntities } from "@/utils/htmlEntities";
import {
  performerCreditsToDraft,
  performersToSavePayload,
} from "@/utils/recordingPerformers";
import { useSavedRecordingsRefresh } from "@/components/recording/SavedRecordingsRefreshContext";
import YouTubeMediaInfoModal from "@/components/recording/YouTubeMediaInfoModal";

const usableYouTubeAlbumName = (value: string | null | undefined) => {
  const albumName = value?.trim();
  return albumName && albumName.toLowerCase() !== "unknown" ? albumName : "";
};

export default function RecordingDetailContent({
  id,
  songId,
  backHref,
}: {
  id: string;
  songId: string;
  backHref: string;
}) {
  const router = useRouter();
  const { play } = usePlayer();
  const { requestRefresh: refreshSavedRecordings } =
    useSavedRecordingsRefresh();
  const {
    recording,
    loading,
    error: loadError,
  } = useSavedRecording(id);

  const [songTitle, setSongTitle] = useState<string | null>(null);
  const [songWorkId, setSongWorkId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RecordingKind>("video_capture");
  const [notes, setNotes] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");
  const [recordingDateStart, setRecordingDateStart] = useState("");
  const [recordingDateEnd, setRecordingDateEnd] = useState("");
  const [recordingLocation, setRecordingLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showYouTubeMediaInfo, setShowYouTubeMediaInfo] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  const [musicbrainzRecordingId, setMusicbrainzRecordingId] = useState<
    string | null
  >(null);
  const [musicbrainzReleaseId, setMusicbrainzReleaseId] = useState<
    string | null
  >(null);
  const [releaseGroup, setReleaseGroup] = useState<{
    title: string;
    musicbrainzReleaseGroupId: string;
  } | null>(null);
  const [performers, setPerformers] = useState<RecordingPerformer[]>([]);
  const [matchStatus, setMatchStatus] = useState<
    "idle" | "searching" | "suggested" | "dismissed" | "no-results"
  >("idle");
  const [suggestedMatch, setSuggestedMatch] =
    useState<RecordingCandidate | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<RecordingCandidate[]>(
    []
  );
  const [manualSearching, setManualSearching] = useState(false);
  const [ignoreAlbumForMatch, setIgnoreAlbumForMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [syncingFromMusicBrainz, setSyncingFromMusicBrainz] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!recording) return;
    const storedName = recording.name || "";
    const storedArtist = recording.artist || "";
    const storedAlbum = recording.release_groups?.title || recording.album || "";
    const displayedAlbum =
      storedAlbum ||
      recording.youtube_items
        .map((item) => usableYouTubeAlbumName(item.ytmusic_album_name))
        .find(Boolean) ||
      "";
    const decodedName = decodeHtmlEntities(storedName);
    const decodedArtist = decodeHtmlEntities(storedArtist);
    const decodedAlbum = decodeHtmlEntities(displayedAlbum);

    setName(decodedName);
    setKind(recording.kind || "video_capture");
    setNotes(recording.user_data.notes || "");
    setArtist(decodedArtist);
    setAlbum(decodedAlbum);
    setYear(recording.year || "");
    setRecordingDateStart(recording.recording_date_start || "");
    setRecordingDateEnd(recording.recording_date_end || "");
    setRecordingLocation(recording.recording_location || "");
    setDuration(recording.duration || "");
    setKey(recording.user_data.key || "");
    setTempo(
      recording.user_data.tempo != null
        ? String(recording.user_data.tempo)
        : ""
    );
    setTags((recording.user_data.tags || []).join(", "));
    setVideoId(recording.youtube_items[0]?.video_id ?? null);
    setMusicbrainzRecordingId(recording.musicbrainz_recording_id || null);
    setMusicbrainzReleaseId(recording.musicbrainz_release_id || null);
    setReleaseGroup(
      recording.release_groups
        ? {
            title: recording.release_groups.title,
            musicbrainzReleaseGroupId:
              recording.release_groups.musicbrainz_release_group_id,
          }
        : null
    );
    setPerformers(
      performerCreditsToDraft(recording.recording_artist_credits ?? [])
    );
    setIsSaved(
      decodedName === storedName &&
        decodedArtist === storedArtist &&
        decodedAlbum === storedAlbum
    );
  }, [recording]);

  useEffect(() => {
    const fetchSongTitle = async () => {
      const { data } = await supabase
        .from("song_user_data")
        .select(songWithUserDataSelect)
        .eq("song_id", songId)
        .single();
      const song = data ? mapSongUserDataRow(data as never) : null;
      setSongTitle(song ? effectiveSongTitle(song, song.user_data) : null);
      setSongWorkId(song?.musicbrainz_work_id ?? null);
    };
    fetchSongTitle();
  }, [songId]);

  // Once the Recording and its Song's title have loaded, proactively search
  // MusicBrainz for a likely match -- gated on an existing `artist` value,
  // since title-only search is too noisy for songs with many recorded
  // versions. A rejected/no-result search isn't persisted anywhere; it may
  // suggest again on a later visit (kept deliberately simple).
  useEffect(() => {
    if (
      loading ||
      !songTitle ||
      !artist ||
      musicbrainzRecordingId ||
      matchStatus !== "idle"
    ) {
      return;
    }

    let cancelled = false;
    setMatchStatus("searching");

    searchRecordingMetadata(songTitle, artist, duration, album, songWorkId, year)
      .then((result) => {
        if (cancelled) return;
        if (result.state === "clear" && result.candidates.length > 0) {
          setSuggestedMatch(result.candidates[0]);
          setMatchStatus("suggested");
        } else if (result.candidates.length > 0) {
          setManualResults(result.candidates);
          setShowManualSearch(true);
          setMatchStatus("dismissed");
          setMatchError(
            result.state === "degraded"
              ? "MusicBrainz results are based on incomplete evidence. Choose a match."
              : "Several MusicBrainz recordings are plausible. Choose a match."
          );
        } else {
          setMatchStatus("no-results");
        }
      })
      .catch(() => {
        if (!cancelled) setMatchStatus("no-results");
      });

    return () => {
      cancelled = true;
    };
    // matchStatus is deliberately excluded: it's set inside this effect, so
    // including it would make the effect re-run (and cancel itself, via the
    // cleanup above) the instant it flips to "searching".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, songTitle, artist, duration, album, year, songWorkId, musicbrainzRecordingId]);

  const handleSave = async () => {
    if (!id || !recording) return;

    const { error } = await supabase.rpc("update_saved_recording", {
      p_recording_id: id,
      p_shared: {
        name,
        kind,
        artist: artist || null,
        album: album || null,
        year: year || null,
        duration: duration || null,
        musicbrainz_recording_id: musicbrainzRecordingId,
        musicbrainz_release_id: musicbrainzReleaseId,
        recording_date_start: recordingDateStart || null,
        recording_date_end: recordingDateEnd || null,
        recording_location: recordingLocation || null,
        release_group: releaseGroup
          ? {
              title: releaseGroup.title,
              musicbrainz_release_group_id:
                releaseGroup.musicbrainzReleaseGroupId,
            }
          : null,
        performers: performersToSavePayload(performers),
      },
      p_private: {
        key: key || null,
        tempo: tempo || null,
        notes: notes || null,
        rating: recording.user_data.rating ?? null,
        sort_order: recording.user_data.sort_order ?? null,
        tags: tags
          ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      },
    });

    if (error) {
      console.error("Error saving data:", error.message);
      setError(`Error saving data: ${error.message}`);
    } else {
      setError(null);
      setIsSaved(true);
    }
  };

  // Links a chosen MusicBrainz Recording and autofills the fields it knows
  // about -- unlike the Song/Work flow, which only links the ID and leaves
  // autofill to a separate "Update from MusicBrainz" action, since autofill
  // on confirm is the point of this feature. Used by both the auto-suggest
  // confirm button and picking a result from manual search.
  const applyResolvedMatch = (match: ResolvedRecordingMatch) => {
    setMusicbrainzRecordingId(match.recordingId);
    setMusicbrainzReleaseId(match.representativeReleaseId);
    if (match.artistCredit) setArtist(match.artistCredit);
    if (match.releaseGroup) setAlbum(match.releaseGroup.title);
    setReleaseGroup(match.releaseGroup);
    setRecordingDateStart(match.recordingDateStart || "");
    setRecordingDateEnd(match.recordingDateEnd || "");
    setRecordingLocation(match.recordingLocation || "");
    setPerformers(match.performers);
    if (match.duration) setDuration(match.duration);
    setSuggestedMatch(null);
    setShowManualSearch(false);
    setManualResults([]);
    setMatchError(null);
    setIsSaved(false);
  };

  const applyMatch = async (candidate: RecordingCandidate) => {
    setManualSearching(true);
    setMatchError(null);
    const match = await fetchRecordingDetail(candidate.recordingId, songWorkId);
    setManualSearching(false);
    if (!match) {
      setMatchError("Couldn't load that MusicBrainz recording. Try again.");
      return;
    }
    applyResolvedMatch(match);
  };

  const handleRejectSuggestion = () => {
    setSuggestedMatch(null);
    setMatchStatus("dismissed");
  };

  const handleOpenManualSearch = () => {
    setShowManualSearch(true);
    setManualQuery(songTitle || name);
    setIgnoreAlbumForMatch(false);
    setMatchError(null);
  };

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;

    setManualSearching(true);
    setMatchError(null);
    try {
      const result = await searchRecordingMetadata(
          manualQuery,
          artist,
          duration,
          ignoreAlbumForMatch ? null : album,
          songWorkId,
          year
        );
      setManualResults(result.candidates);
      if (result.state !== "clear") {
        setMatchError(
          result.state === "degraded"
            ? "Results use incomplete evidence. Choose carefully."
            : "Several results are plausible. Choose the correct recording."
        );
      }
    } catch {
      setMatchError("Couldn't search MusicBrainz. Try again later.");
    }
    setManualSearching(false);
  };

  // Re-fetches artist/album/year/duration from the linked MusicBrainz
  // recording and overwrites the current form state with it -- mirrors the
  // Song page's "Update from MusicBrainz". User still has to hit Save.
  const handleUpdateFromMusicBrainz = async () => {
    if (!musicbrainzRecordingId) return;

    setSyncError(null);
    setSyncingFromMusicBrainz(true);
    const match = await fetchRecordingDetail(musicbrainzRecordingId, songWorkId);
    setSyncingFromMusicBrainz(false);

    if (!match) {
      setSyncError("Couldn't fetch the latest data from MusicBrainz.");
      return;
    }

    applyResolvedMatch(match);
  };

  const handleChangeMatch = () => {
    setShowManualSearch(true);
    setManualQuery(songTitle || name);
    setManualResults([]);
    setIgnoreAlbumForMatch(false);
    setMatchError(null);
  };

  const handleRemoveMusicBrainzMatch = () => {
    setMusicbrainzRecordingId(null);
    setMusicbrainzReleaseId(null);
    setReleaseGroup(null);
    setPerformers([]);
    setSuggestedMatch(null);
    setShowManualSearch(false);
    setManualResults([]);
    setMatchStatus("dismissed");
    setMatchError(null);
    setSyncError(null);
    setIsSaved(false);
  };

  const handleDelete = async () => {
    if (!id) return;

    const { error } = await supabase
      .from("user_recording_data")
      .delete()
      .eq("recording_id", id);

    if (error) {
      console.error("Error removing recording:", error.message);
      setError(`Error removing recording: ${error.message}`);
    } else {
      refreshSavedRecordings();
      router.push(backHref);
    }
  };

  const handleFieldChange = useFieldChange(setIsSaved);

  if (loading) return <RecordingDetailSkeleton backHref={backHref} />;
  if (error || loadError)
    return (
      <AsyncStateMessage variant="error">{error || loadError}</AsyncStateMessage>
    );
  if (!recording)
    return <AsyncStateMessage>No recording found.</AsyncStateMessage>;

  return (
    <div className="w-full h-full flex flex-col bg-surface-app">
      <PaneHeader backHref={backHref} backLabel="Back to song" safeAreaTop>
        <div className="pb-4" />
      </PaneHeader>

      <div className="flex-1 overflow-y-auto overscroll-none p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {videoId && recording && (
        <div className="mb-6 space-y-2">
          <button
            onClick={() =>
              play({
                name: recording.name,
                songTitle,
                artist: recording.artist,
                kind,
                youtubeVideoId: videoId,
              })
            }
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-action text-text-on-accent font-bold rounded-md hover:bg-action-hover"
          >
            <PlayIcon className="w-5 h-5" />
            Play
          </button>
          <button
            type="button"
            onClick={() => setShowYouTubeMediaInfo(true)}
            className="w-full rounded-md border border-paper-600 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-paper-100"
          >
            YouTube media info
          </button>
        </div>
      )}
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-center mb-4">
          {(releaseGroup || musicbrainzReleaseId) && (
            <RecordingThumbnail
              src={releaseGroupCoverArtUrl(
                releaseGroup?.musicbrainzReleaseGroupId
              )}
              fallbackSrc={coverArtUrl(musicbrainzReleaseId)}
              alt=""
              className="w-16 h-16 rounded shrink-0 mr-3"
            />
          )}
          <input
            value={name}
            onChange={handleFieldChange(setName)}
            className="font-bold text-2xl bg-transparent pb-2 w-full"
          />
          <SaveStatusButton isSaved={isSaved} className="block relative ml-2" />
        </div>

        <div className="mb-4">
          <FormField label="Artist" value={artist} onChange={handleFieldChange(setArtist)} />
        </div>
        <label className="block mb-4">
          <span className="block text-xs text-ink-600">Recording kind</span>
          <select
            value={kind}
            onChange={(event) => {
              setKind(event.target.value as RecordingKind);
              setIsSaved(false);
            }}
            className="block w-full p-1.5 rounded-md"
          >
            <option value="released">Released recording</option>
            <option value="video_capture">Video capture</option>
          </select>
        </label>
        <div className="mb-4">
          <FormField label="Album" value={album} onChange={handleFieldChange(setAlbum)} />
        </div>
        <div className="mb-4">
          <FormField label="Year" value={year} onChange={handleFieldChange(setYear)} />
        </div>
        <div className="mb-4">
          <FormField
            label="Recorded"
            value={
              recordingDateEnd
                ? `${recordingDateStart} – ${recordingDateEnd}`
                : recordingDateStart
            }
            onChange={() => undefined}
            disabled
            placeholder="Unknown"
          />
        </div>
        <div className="mb-4">
          <FormField
            label="Recording location"
            value={recordingLocation}
            onChange={handleFieldChange(setRecordingLocation)}
            placeholder="Unknown"
          />
        </div>
        <div className="mb-4">
          <FormField label="Duration" value={duration} onChange={handleFieldChange(setDuration)} />
        </div>
        <div className="mb-4">
          {showManualSearch ? (
            <>
              <label className="block mb-2">
                <span className="block text-xs text-ink-600">Search MusicBrainz</span>
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleManualSearch();
                    }
                  }}
                  className="block w-full p-1.5 rounded-md"
                />
              </label>
              {album && (
                <label className="flex items-center gap-1.5 mb-2 text-xs text-ink-600">
                  <input
                    type="checkbox"
                    checked={ignoreAlbumForMatch}
                    onChange={(e) => setIgnoreAlbumForMatch(e.target.checked)}
                  />
                  {`"${album}" might be a compilation -- don't use it to match`}
                </label>
              )}
              <LinkButton
                onClick={handleManualSearch}
                disabled={manualSearching}
                className="mb-2 mr-3"
              >
                {manualSearching ? "Searching..." : "Search"}
              </LinkButton>
              <LinkButton
                variant="muted"
                onClick={() => setShowManualSearch(false)}
                className="mb-2"
              >
                Cancel
              </LinkButton>
              <RecordingMatchResultsList results={manualResults} onSelect={applyMatch} />
            </>
          ) : musicbrainzRecordingId ? (
            <>
              <MusicBrainzLink type="recording" id={musicbrainzRecordingId} />
              <SyncFromMusicBrainzButton
                syncing={syncingFromMusicBrainz}
                onClick={handleUpdateFromMusicBrainz}
                className="text-xs text-azure-600 underline disabled:opacity-70 mr-3"
              />
              <LinkButton variant="muted" onClick={handleChangeMatch}>
                Change match
              </LinkButton>
              <button
                type="button"
                onClick={handleRemoveMusicBrainzMatch}
                className="ml-3 text-xs text-vermillion-600 underline"
              >
                Remove match
              </button>
              {syncError && <p className="text-sm text-ink-600 mt-1">{syncError}</p>}
            </>
          ) : suggestedMatch ? (
            <RecordingMatchSuggestion
              match={suggestedMatch}
              onConfirm={applyMatch}
              onReject={handleRejectSuggestion}
              onSearchManually={handleOpenManualSearch}
            />
          ) : (
            <LinkButton
              onClick={handleOpenManualSearch}
              disabled={matchStatus === "searching"}
            >
              {matchStatus === "searching"
                ? "Looking for a match..."
                : "Match with MusicBrainz"}
            </LinkButton>
          )}
          {matchError && <p className="text-sm text-ink-600 mt-1">{matchError}</p>}
        </div>

        <div className="mb-4">
          <FormField label="Key" value={key} onChange={handleFieldChange(setKey)} />
        </div>
        <div className="mb-4">
          <FormField
            label="Tempo (BPM)"
            type="number"
            value={tempo}
            onChange={handleFieldChange(setTempo)}
          />
        </div>
        <div className="mb-4">
          <FormField
            label="Tags (comma separated)"
            value={tags}
            onChange={handleFieldChange(setTags)}
          />
        </div>

        <NotesField
          label="Notes"
          value={notes}
          onChange={handleFieldChange(setNotes)}
          rows={10}
          placeholder="Add notes here"
        />
      </form>

      <DeleteButton
        label="Recording"
        actionLabel="Remove from my Recordings"
        confirmMessage="Remove this Recording from your saved Recordings? Shared metadata will remain available."
        onDelete={handleDelete}
      />
      </div>
      {showYouTubeMediaInfo && (
        <YouTubeMediaInfoModal
          items={recording.youtube_items}
          onClose={() => setShowYouTubeMediaInfo(false)}
        />
      )}
    </div>
  );
}

function RecordingDetailSkeleton({ backHref }: { backHref: string }) {
  return (
    <div
      className="flex h-full w-full flex-col bg-surface-app"
      role="status"
      aria-label="Loading recording"
    >
      <span className="sr-only">Loading recording...</span>
      <div aria-hidden="true" className="contents">
        <PaneHeader backHref={backHref} backLabel="Back to song" safeAreaTop>
          <div className="pb-4" />
        </PaneHeader>

        <div className="flex-1 overflow-hidden p-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
          <div className="animate-pulse">
            <div className="mb-6 space-y-2">
              <div className="h-12 w-full rounded-md bg-surface-sunken" />
              <div className="h-10 w-full rounded-md bg-surface-sunken" />
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="h-8 w-2/3 rounded-sm bg-surface-sunken" />
              <div className="ml-2 h-6 w-6 shrink-0 rounded-full bg-surface-sunken" />
            </div>

            <RecordingFieldSkeleton width="w-2/3" />
            <RecordingFieldSkeleton width="w-full" />
            <RecordingFieldSkeleton width="w-3/4" />
            <RecordingFieldSkeleton width="w-1/3" />
            <RecordingFieldSkeleton width="w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordingFieldSkeleton({ width }: { width: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1 h-3 w-20 rounded-sm bg-surface-sunken" />
      <div className={`h-8 ${width} rounded-md bg-surface-sunken`} />
    </div>
  );
}
