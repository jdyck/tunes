import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { recordingArtwork } from "@/utils/recordingArtwork";
import type { RecordingArtwork } from "@/utils/recordingArtwork";

// Loads one image per Song for the Songs list, keyed by `song_id`.
// Running separately means artwork never holds up the Song list: rows render
// as soon as the Song query lands and images fill in reactively afterward.
export const useSongArtwork = () => {
  const rows = useQuery(api.recordings.listArtworkMine);

  return useMemo(() => {
    const artworkBySong = new Map<string, RecordingArtwork>();
    for (const row of rows ?? []) {
      artworkBySong.set(row.song_id, recordingArtwork(row));
    }
    return artworkBySong;
  }, [rows]);
};
