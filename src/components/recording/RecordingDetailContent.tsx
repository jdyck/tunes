"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { PlayIcon } from "@heroicons/react/20/solid";
import { usePlayer } from "@/components/player/GlobalPlayer";
import PaneHeader from "@/components/layout/PaneHeader";
import LinkButton from "@/components/ui/LinkButton";
import { RecordingMatchResult } from "@/lib/musicbrainz";
import {
  coverArtUrl,
  fetchRecordingDetail,
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
  const {
    recording,
    loading,
    error: loadError,
  } = useSavedRecording(id);

  const [songTitle, setSongTitle] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RecordingKind>("video_capture");
  const [notes, setNotes] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [year, setYear] = useState("");
  const [duration, setDuration] = useState("");
  const [key, setKey] = useState("");
  const [tempo, setTempo] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(true);

  const [musicbrainzRecordingId, setMusicbrainzRecordingId] = useState<
    string | null
  >(null);
  const [musicbrainzReleaseId, setMusicbrainzReleaseId] = useState<
    string | null
  >(null);
  const [matchStatus, setMatchStatus] = useState<
    "idle" | "searching" | "suggested" | "dismissed" | "no-results"
  >("idle");
  const [suggestedMatch, setSuggestedMatch] =
    useState<RecordingMatchResult | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<RecordingMatchResult[]>(
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
    const storedAlbum = recording.album || "";
    const decodedName = decodeHtmlEntities(storedName);
    const decodedArtist = decodeHtmlEntities(storedArtist);
    const decodedAlbum = decodeHtmlEntities(storedAlbum);

    setName(decodedName);
    setKind(recording.kind || "video_capture");
    setNotes(recording.user_data.notes || "");
    setArtist(decodedArtist);
    setAlbum(decodedAlbum);
    setYear(recording.year || "");
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

    searchRecordingMetadata(songTitle, artist, duration, album)
      .then((results) => {
        if (cancelled) return;
        if (results.length > 0) {
          setSuggestedMatch(results[0]);
          setMatchStatus("suggested");
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
  }, [loading, songTitle, artist, duration, album, musicbrainzRecordingId]);

  const handleSave = async () => {
    if (!id || !recording) return;

    const { error } = await supabase.rpc("update_saved_recording", {
      p_recording_id: id,
      p_name: name,
      p_kind: kind,
      p_artist: artist || null,
      p_album: album || null,
      p_year: year || null,
      p_duration: duration || null,
      p_key: key || null,
      p_tempo: tempo || null,
      p_musicbrainz_recording_id: musicbrainzRecordingId,
      p_musicbrainz_release_id: musicbrainzReleaseId,
      p_notes: notes || null,
      p_rating: recording.user_data.rating ?? null,
      p_sort_order: recording.user_data.sort_order ?? null,
      p_tags: tags
        ? tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : null,
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
  const applyMatch = (match: RecordingMatchResult) => {
    setMusicbrainzRecordingId(match.recordingId);
    setMusicbrainzReleaseId(match.albumReleaseId);
    if (match.artistCredit) setArtist(match.artistCredit);
    if (match.album) setAlbum(match.album);
    if (match.year) setYear(match.year);
    if (match.duration) setDuration(match.duration);
    setSuggestedMatch(null);
    setShowManualSearch(false);
    setManualResults([]);
    setMatchError(null);
    setIsSaved(false);
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
      setManualResults(
        await searchRecordingMetadata(
          manualQuery,
          artist,
          duration,
          ignoreAlbumForMatch ? null : album
        )
      );
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
    const match = await fetchRecordingDetail(musicbrainzRecordingId);
    setSyncingFromMusicBrainz(false);

    if (!match) {
      setSyncError("Couldn't fetch the latest data from MusicBrainz.");
      return;
    }

    if (match.artistCredit) setArtist(match.artistCredit);
    if (match.album) setAlbum(match.album);
    setMusicbrainzReleaseId(match.albumReleaseId);
    if (match.year) setYear(match.year);
    if (match.duration) setDuration(match.duration);
    setIsSaved(false);
  };

  const handleChangeMatch = () => {
    setShowManualSearch(true);
    setManualQuery(songTitle || name);
    setManualResults([]);
    setIgnoreAlbumForMatch(false);
    setMatchError(null);
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
      router.push(backHref);
    }
  };

  const handleFieldChange = useFieldChange(setIsSaved);

  if (loading)
    return <AsyncStateMessage>Loading recording...</AsyncStateMessage>;
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
          className="mb-6 w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-800 text-white font-bold rounded-md hover:bg-green-900"
        >
          <PlayIcon className="w-5 h-5" />
          Play
        </button>
      )}
      <form
        className="w-full"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <div className="flex justify-between items-center mb-4">
          {musicbrainzReleaseId && (
            <RecordingThumbnail
              src={coverArtUrl(musicbrainzReleaseId)}
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
                className="text-xs text-teal-700 underline disabled:opacity-70 mr-3"
              />
              <LinkButton variant="muted" onClick={handleChangeMatch}>
                Change match
              </LinkButton>
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
    </div>
  );
}
