"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  createSaveLifecycleState,
  reduceSaveLifecycle,
  saveLifecycleIsDirty,
  saveLifecycleStatus,
} from "@/utils/saveLifecycle";

const DEFAULT_SUCCESS_DURATION_MS = 5_000;

export function useSaveLifecycle(
  successDurationMs = DEFAULT_SUCCESS_DURATION_MS
) {
  const [state, dispatch] = useReducer(
    reduceSaveLifecycle,
    false,
    createSaveLifecycleState
  );
  const revisionRef = useRef(0);
  const savingRevisionRef = useRef<number | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessTimer = useCallback(() => {
    if (successTimerRef.current !== null) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearSuccessTimer, [clearSuccessTimer]);

  const reset = useCallback(
    (dirty = false) => {
      clearSuccessTimer();
      revisionRef.current = dirty ? 1 : 0;
      savingRevisionRef.current = null;
      dispatch({ type: "reset", dirty });
    },
    [clearSuccessTimer]
  );

  const markDirty = useCallback(() => {
    clearSuccessTimer();
    revisionRef.current += 1;
    dispatch({ type: "edited", revision: revisionRef.current });
  }, [clearSuccessTimer]);

  const beginSave = useCallback(() => {
    if (savingRevisionRef.current !== null) return null;
    const revision = revisionRef.current;
    savingRevisionRef.current = revision;
    clearSuccessTimer();
    dispatch({ type: "save-started", revision });
    return revision;
  }, [clearSuccessTimer]);

  const saveSucceeded = useCallback(
    (revision: number) => {
      if (savingRevisionRef.current !== revision) return false;
      savingRevisionRef.current = null;
      const isCurrentRevision = revisionRef.current === revision;
      dispatch({ type: "save-succeeded", revision });
      if (isCurrentRevision) {
        successTimerRef.current = setTimeout(() => {
          successTimerRef.current = null;
          dispatch({ type: "recently-saved-expired" });
        }, successDurationMs);
      }
      return isCurrentRevision;
    },
    [successDurationMs]
  );

  const saveFailed = useCallback((revision: number, error: string) => {
    if (savingRevisionRef.current !== revision) return;
    savingRevisionRef.current = null;
    dispatch({ type: "save-failed", revision, error });
  }, []);

  return {
    status: saveLifecycleStatus(state),
    isDirty: saveLifecycleIsDirty(state),
    error: state.error,
    markDirty,
    reset,
    beginSave,
    saveSucceeded,
    saveFailed,
  };
}
