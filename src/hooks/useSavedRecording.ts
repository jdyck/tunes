import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { SavedRecording } from "@/types/types";

export const useSavedRecording = (recordingId: string) => {
  const result = useQuery(api.recordings.getMine, {
    recordingId: recordingId as Id<"recordings">,
  });

  return {
    recording: (result ?? null) as SavedRecording | null,
    loading: result === undefined,
    error: null,
  };
};
