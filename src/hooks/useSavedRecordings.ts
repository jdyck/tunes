import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SavedRecording } from "@/types/types";
import { errorMessage } from "@/utils/errorMessage";

export const useSavedRecordings = (songId: string) => {
  const result = useQuery(api.recordings.listMine, {
    songId: songId as Id<"songs">,
  });
  const reorderRecordings = useMutation(api.recordings.reorder);
  const [optimisticRecordings, setOptimisticRecordings] = useState<
    SavedRecording[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const loadedRecordings = (result ?? []) as SavedRecording[];
  const recordings = optimisticRecordings ?? loadedRecordings;

  useEffect(() => {
    if (!optimisticRecordings || !result) return;
    if (
      result.map((recording) => recording.id).join("|") ===
      optimisticRecordings.map((recording) => recording.id).join("|")
    ) {
      setOptimisticRecordings(null);
    }
  }, [optimisticRecordings, result]);

  const reorder = useCallback(
    async (reordered: SavedRecording[]): Promise<boolean> => {
      setOptimisticRecordings(reordered);
      try {
        await reorderRecordings({
          songId: songId as Id<"songs">,
          recordingIds: reordered.map(
            (recording) => recording.id as Id<"recordings">,
          ),
        });
        setError(null);
        return true;
      } catch (problem) {
        setOptimisticRecordings(null);
        setError(`Error saving recording order: ${errorMessage(problem)}`);
        return false;
      }
    },
    [reorderRecordings, songId],
  );

  return {
    recordings,
    loading: result === undefined,
    error,
    reorder,
  };
};
