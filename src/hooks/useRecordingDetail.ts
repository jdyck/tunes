"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSavedRecording } from "@/hooks/useSavedRecording";
import { useSaveLifecycle } from "@/hooks/useSaveLifecycle";
import {
  recordingDraftDidSave,
  recordingDraftIsDirty,
  recordingDraftToPayload,
  recordingToEditorState,
  type RecordingDraft,
  type RecordingEditorState,
} from "@/utils/recordingDraft";
import { errorMessage } from "@/utils/errorMessage";

export function useRecordingDetail(id: string) {
  const { recording, loading, error: loadError } = useSavedRecording(id);
  const [editorState, setEditorState] =
    useState<RecordingEditorState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  const save = useCallback(async () => {
    const draft = editorState?.draft;
    if (!recording || !draft) return;

    const saveRevision = beginSave();
    if (saveRevision === null) return;

    try {
      const payload = recordingDraftToPayload(recording, draft);
      await updateRecording({
        recordingId: id as Id<"recordings">,
        shared: payload.shared,
        privateData: payload.private,
      });

      setSaveError(null);
      setEditorState((current) =>
        current ? recordingDraftDidSave(current, draft) : current
      );
      saveSucceeded(saveRevision);
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
    draft: editorState?.draft ?? null,
    loading,
    loadError,
    saveError,
    saveStatus,
    isDirty,
    patchDraft,
    save,
  };
}
