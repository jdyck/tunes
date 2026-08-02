import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mapSongArtworkRows, songArtworkSelect } from "@/lib/recordings";
import type { RecordingArtwork } from "@/utils/recordingArtwork";

const noArtwork: Map<string, RecordingArtwork> = new Map();

// Loads one image per Song for the Songs list, keyed by `song_id`.
//
// This is a second query rather than an embed on the Songs fetch because the
// representative Recording is the one highest in the User's own `sort_order`,
// which lives on `user_recording_data` -- a table PostgREST cannot order a
// nested embed by from the Songs side. Querying from `user_recording_data`
// instead gets that ordering at the top level, the way the Song detail pane
// already does.
//
// Running separately also means artwork resolves without holding up the list:
// rows render as soon as the Songs query lands and images fill in after.
export const useSongArtwork = (userId: string | undefined) => {
  const [artworkBySong, setArtworkBySong] = useState(noArtwork);

  useEffect(() => {
    if (!userId) {
      setArtworkBySong(noArtwork);
      return;
    }

    let cancelled = false;

    const loadArtwork = async () => {
      const { data, error } = await supabase
        .from("user_recording_data")
        .select(songArtworkSelect)
        .eq("user_id", userId)
        .order("sort_order", { ascending: true, nullsFirst: false });

      if (cancelled) return;
      if (error) {
        // Artwork is decoration around a list that is fully usable without it,
        // so a failure here stays out of the pane's error state and leaves the
        // rows showing their placeholder.
        console.error("Error fetching Song artwork:", error.message);
        return;
      }

      setArtworkBySong(mapSongArtworkRows(data as never));
    };

    void loadArtwork();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return artworkBySong;
};
