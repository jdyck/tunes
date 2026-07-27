import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  mapSavedRecordingRow,
  savedRecordingSelect,
} from "@/lib/recordings";
import { SavedRecording } from "@/types/types";
import { useSavedRecordingsRefresh } from "@/components/recording/SavedRecordingsRefreshContext";

export const useSavedRecordings = (songId: string) => {
  const { revision } = useSavedRecordingsRefresh();
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (
    { showLoading = true }: { showLoading?: boolean } = {}
  ): Promise<SavedRecording[] | null> => {
    if (showLoading) setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("user_recording_data")
      .select(savedRecordingSelect)
      .eq("recordings.song_id", songId)
      .order("sort_order", { ascending: true, nullsFirst: false });

    if (queryError) {
      setError(`Error fetching recordings: ${queryError.message}`);
      if (showLoading) setLoading(false);
      return null;
    }

    const nextRecordings = (data ?? [])
      .map((row) => mapSavedRecordingRow(row as never))
      .filter((row): row is SavedRecording => row !== null);
    setRecordings(nextRecordings);
    if (showLoading) setLoading(false);
    return nextRecordings;
  }, [songId]);

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  return { recordings, loading, error, refresh };
};
