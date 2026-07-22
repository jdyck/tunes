import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  mapSavedRecordingRow,
  savedRecordingSelect,
} from "@/lib/recordings";
import { SavedRecording } from "@/types/types";

export const useSavedRecording = (recordingId: string) => {
  const [recording, setRecording] = useState<SavedRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("user_recording_data")
      .select(savedRecordingSelect)
      .eq("recording_id", recordingId)
      .single();

    if (queryError) {
      setError(`Error fetching recording: ${queryError.message}`);
      setLoading(false);
      return;
    }

    setRecording(mapSavedRecordingRow(data as never));
    setLoading(false);
  }, [recordingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recording, loading, error, refresh };
};
