import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  mapSavedRecordingRow,
  savedRecordingSelect,
} from "@/lib/recordings";
import { SavedRecording } from "@/types/types";

export const useSavedRecordings = (songId: string) => {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("user_recording_data")
      .select(savedRecordingSelect)
      .eq("recordings.song_id", songId)
      .order("sort_order", { ascending: true, nullsFirst: false });

    if (queryError) {
      setError(`Error fetching recordings: ${queryError.message}`);
      setLoading(false);
      return;
    }

    setRecordings(
      (data ?? [])
        .map((row) => mapSavedRecordingRow(row as never))
        .filter((row): row is SavedRecording => row !== null)
    );
    setLoading(false);
  }, [songId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recordings, loading, error, refresh };
};
