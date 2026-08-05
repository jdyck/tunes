"use client";

import { useCallback, useEffect, useState } from "react";
import { useSavedRecording } from "@/hooks/useSavedRecording";
import { useSaveLifecycle } from "@/hooks/useSaveLifecycle";
import { supabase } from "@/lib/supabaseClient";
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
    if (!recording) return;
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
      const { error } = await supabase.rpc("update_saved_recording", {
        p_recording_id: id,
        p_shared: payload.shared,
        p_private: payload.private,
      });
      if (error) throw error;

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
  }, [beginSave, editorState, id, recording, saveFailed, saveSucceeded]);

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
