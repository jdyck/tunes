"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSavedRecording } from "@/hooks/useSavedRecording";
import { useSaveLifecycle } from "@/hooks/useSaveLifecycle";
import {
  recordingDraftAfterMusicBrainzLookup,
  recordingEditorStateAfterSave,
  recordingDraftIsDirty,
  recordingDraftToPayload,
  recordingDraftWithoutMusicBrainzMatch,
  recordingToEditorState,
  type RecordingDraft,
  type RecordingEditorState,
} from "@/utils/recordingDraft";
import { errorMessage } from "@/utils/errorMessage";
import { effectiveSongTitle } from "@/utils/songTitle";
import {
  fetchRecordingDetail,
  searchRecordingMetadata,
} from "@/lib/recordingMetadataClient";
import type { RecordingCandidate, ResolvedRecordingMatch } from "@/lib/musicbrainz";

export function useRecordingDetail(id: string, songId: string) {
  const { recording, loading, error: loadError } = useSavedRecording(id);
  const songResult = useQuery(api.songs.getMine, {
    songId: songId as Id<"songs">,
  });
  const [editorState, setEditorState] =
    useState<RecordingEditorState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<
    "idle" | "searching" | "suggested" | "dismissed" | "no-results"
  >("idle");
  const [suggestedMatch, setSuggestedMatch] =
    useState<RecordingCandidate | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualResults, setManualResults] = useState<RecordingCandidate[]>([]);
  const [manualSearching, setManualSearching] = useState(false);
  const [ignoreAlbumForMatch, setIgnoreAlbumForMatch] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [syncingFromMusicBrainz, setSyncingFromMusicBrainz] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const hydratedRecordingIdRef = useRef<string | null>(null);
  const updateRecording = useMutation(api.recordings.update);
  const {
    status: saveStatus,
    isDirty,
    markDirty,
    reset,
    beginSave,
    saveSucceeded,
    saveFailed,
  } = useSaveLifecycle();

  useEffect(() => {
    if (!recording || hydratedRecordingIdRef.current === recording.id) return;
    hydratedRecordingIdRef.current = recording.id;
    const nextEditorState = recordingToEditorState(recording);
    setEditorState(nextEditorState);
    setSaveError(null);
    reset(recordingDraftIsDirty(nextEditorState));
  }, [recording, reset]);

  const patchDraft = useCallback(
    (patch: Partial<RecordingDraft>) => {
      setEditorState((current) =>
        current
          ? { ...current, draft: { ...current.draft, ...patch } }
          : current
      );
      markDirty();
    },
    [markDirty]
  );

  const draft = editorState?.draft ?? null;
  const songTitle = songResult
    ? effectiveSongTitle(songResult.song, songResult.song.user_data)
    : null;
  const songWorkId = songResult?.song.musicbrainz_work_id ?? null;
  const artistForSearch = recording?.artist ?? draft?.artist ?? "";
  const musicbrainzRecordingId = draft?.musicbrainzRecordingId ?? null;
  const duration = draft?.duration ?? "";
  const album = draft?.album ?? "";
  const year = draft?.year ?? "";
  const name = draft?.name ?? "";

  useEffect(() => {
    if (
      loading ||
      !songTitle ||
      !artistForSearch ||
      musicbrainzRecordingId ||
      matchStatus !== "idle"
    ) {
      return;
    }

    let cancelled = false;
    setMatchStatus("searching");
    searchRecordingMetadata(
      songTitle,
      artistForSearch,
      duration,
      album,
      songWorkId,
      year,
    )
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
              : "Several MusicBrainz recordings are plausible. Choose a match.",
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
    // matchStatus is set inside this effect; including it would cancel the
    // active search immediately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    loading,
    songTitle,
    artistForSearch,
    duration,
    album,
    year,
    songWorkId,
    musicbrainzRecordingId,
  ]);

  const applyResolvedMatch = useCallback(
    (match: ResolvedRecordingMatch) => {
      const currentDraft = editorState?.draft;
      if (!currentDraft) return;
      patchDraft(recordingDraftAfterMusicBrainzLookup(currentDraft, match));
      setSuggestedMatch(null);
      setShowManualSearch(false);
      setManualResults([]);
      setMatchError(null);
    },
    [editorState?.draft, patchDraft],
  );

  const applyMatch = useCallback(
    async (candidate: RecordingCandidate) => {
      setManualSearching(true);
      setMatchError(null);
      try {
        const match = await fetchRecordingDetail(candidate.recordingId, songWorkId);
        if (!match) {
          setMatchError("Couldn't load that MusicBrainz recording. Try again.");
          return;
        }
        applyResolvedMatch(match);
      } catch {
        setMatchError("Couldn't load that MusicBrainz recording. Try again.");
      } finally {
        setManualSearching(false);
      }
    },
    [applyResolvedMatch, songWorkId],
  );

  const handleOpenManualSearch = useCallback(() => {
    setShowManualSearch(true);
    setManualQuery(songTitle || name);
    setIgnoreAlbumForMatch(false);
    setMatchError(null);
  }, [name, songTitle]);

  const handleChangeMatch = useCallback(() => {
    setShowManualSearch(true);
    setManualQuery(songTitle || name);
    setManualResults([]);
    setIgnoreAlbumForMatch(false);
    setMatchError(null);
  }, [name, songTitle]);

  const handleManualSearch = useCallback(async () => {
    if (!manualQuery.trim()) return;
    setManualSearching(true);
    setMatchError(null);
    try {
      const result = await searchRecordingMetadata(
        manualQuery,
        artistForSearch,
        duration,
        ignoreAlbumForMatch ? null : album,
        songWorkId,
        year,
      );
      setManualResults(result.candidates);
      if (result.state !== "clear") {
        setMatchError(
          result.state === "degraded"
            ? "Results use incomplete evidence. Choose carefully."
            : "Several results are plausible. Choose the correct recording.",
        );
      }
    } catch {
      setMatchError("Couldn't search MusicBrainz. Try again later.");
    } finally {
      setManualSearching(false);
    }
  }, [
    album,
    artistForSearch,
    duration,
    ignoreAlbumForMatch,
    manualQuery,
    songWorkId,
    year,
  ]);

  const handleUpdateFromMusicBrainz = useCallback(async () => {
    if (!musicbrainzRecordingId) return;
    setSyncError(null);
    setSyncingFromMusicBrainz(true);
    try {
      const match = await fetchRecordingDetail(musicbrainzRecordingId, songWorkId);
      if (!match) {
        setSyncError("Couldn't fetch the latest data from MusicBrainz.");
        return;
      }
      applyResolvedMatch(match);
    } catch {
      setSyncError("Couldn't fetch the latest data from MusicBrainz.");
    } finally {
      setSyncingFromMusicBrainz(false);
    }
  }, [applyResolvedMatch, musicbrainzRecordingId, songWorkId]);

  const handleRemoveMusicBrainzMatch = useCallback(() => {
    const currentDraft = editorState?.draft;
    if (!currentDraft) return;
    patchDraft(recordingDraftWithoutMusicBrainzMatch(currentDraft));
    setSuggestedMatch(null);
    setShowManualSearch(false);
    setManualResults([]);
    setMatchStatus("dismissed");
    setMatchError(null);
    setSyncError(null);
  }, [editorState?.draft, patchDraft]);

  const save = useCallback(async () => {
    const draft = editorState?.draft;
    if (!recording || !draft) return;

    const saveRevision = beginSave();
    if (saveRevision === null) return;

    try {
      const payload = recordingDraftToPayload(recording, draft);
      const savedRecording = await updateRecording({
        recordingId: id as Id<"recordings">,
        shared: payload.shared,
        privateData: payload.private,
      });

      setSaveError(null);
      const saveWasCurrent = saveSucceeded(saveRevision);
      setEditorState((current) =>
        !current
          ? current
          : recordingEditorStateAfterSave(current, savedRecording, saveWasCurrent)
      );
    } catch (saveProblem) {
      const message = `Error saving data: ${errorMessage(saveProblem)}`;
      console.error("Error saving data:", saveProblem);
      setSaveError(message);
      saveFailed(saveRevision, message);
    }
  }, [
    beginSave,
    editorState,
    id,
    recording,
    saveFailed,
    saveSucceeded,
    updateRecording,
  ]);

  return {
    recording,
    songTitle,
    draft: editorState?.draft ?? null,
    loading,
    loadError,
    saveError,
    saveStatus,
    isDirty,
    patchDraft,
    save,
    matching: {
      matchStatus,
      suggestedMatch,
      showManualSearch,
      setShowManualSearch,
      manualQuery,
      setManualQuery,
      manualResults,
      manualSearching,
      ignoreAlbumForMatch,
      setIgnoreAlbumForMatch,
      matchError,
      syncingFromMusicBrainz,
      syncError,
      applyMatch,
      handleOpenManualSearch,
      handleManualSearch,
      handleUpdateFromMusicBrainz,
      handleRemoveMusicBrainzMatch,
      handleRejectSuggestion: () => {
        setSuggestedMatch(null);
        setMatchStatus("dismissed");
      },
      handleChangeMatch,
    },
  };
}
