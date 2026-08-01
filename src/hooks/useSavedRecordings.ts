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

  // Reordering is a private-only write: it sets sort_order on the User's own
  // user_recording_data rows and never touches the shared recordings row. It
  // deliberately avoids the update_saved_recording RPC that RecordingDetail
  // uses, since that rewrites shared canonical fields as a side effect and
  // position within a Song is nobody's business but the owner's.
  //
  // The new order is applied optimistically -- a drop that visibly snaps back
  // while a request lands would feel broken -- and rolled back if the write
  // fails. Positions are rewritten for the whole list rather than patching the
  // moved row, because sort_order has never been written before now, so most
  // rows start out sharing the same default value.
  const reorder = useCallback(
    async (reordered: SavedRecording[]): Promise<boolean> => {
      const previous = recordings;
      setRecordings(reordered);

      const { error: reorderError } = await supabase
        .from("user_recording_data")
        .upsert(
          reordered.map((recording, index) => ({
            user_id: recording.user_data.user_id,
            recording_id: recording.id,
            sort_order: index,
          })),
          { onConflict: "user_id,recording_id" }
        );

      if (reorderError) {
        setRecordings(previous);
        setError(`Error saving recording order: ${reorderError.message}`);
        return false;
      }

      setError(null);
      return true;
    },
    [recordings]
  );

  useEffect(() => {
    refresh();
  }, [refresh, revision]);

  return { recordings, loading, error, refresh, reorder };
};
