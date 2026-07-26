import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ArtistKind } from "@/types/types";

export interface RecordingArtistSummary {
  id: string;
  name: string;
  kind: ArtistKind | null;
  recordingCount: number;
}

interface CreditRow {
  artist_id: string;
  artists: { id: string; name: string; kind: ArtistKind | null } | null;
}

interface RecordingArtistRow {
  recording_id: string;
  recordings: {
    recording_artist_credits: CreditRow[] | null;
  } | null;
}

// Every artist credited as a performer on one of the user's saved recordings,
// with how many of those recordings they appear on. RLS scopes
// user_recording_data to the current user, so this stays within the user's
// repertoire without an explicit user filter.
export const useRecordingArtists = () => {
  const [artists, setArtists] = useState<RecordingArtistSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("user_recording_data")
        .select(
          `recording_id, recordings!inner(recording_artist_credits(artist_id, artists(id, name, kind)))`
        );

      if (cancelled) return;

      if (queryError) {
        setError(`Error fetching artists: ${queryError.message}`);
        setLoading(false);
        return;
      }

      const byId = new Map<
        string,
        { id: string; name: string; kind: ArtistKind | null; recordings: Set<string> }
      >();

      for (const row of (data ?? []) as unknown as RecordingArtistRow[]) {
        const recordingId = row.recording_id;
        for (const credit of row.recordings?.recording_artist_credits ?? []) {
          const artist = credit.artists;
          if (!artist?.id) continue;
          const existing = byId.get(artist.id);
          if (existing) {
            existing.recordings.add(recordingId);
          } else {
            byId.set(artist.id, {
              id: artist.id,
              name: artist.name,
              kind: artist.kind ?? null,
              recordings: new Set([recordingId]),
            });
          }
        }
      }

      setArtists(
        [...byId.values()].map((entry) => ({
          id: entry.id,
          name: entry.name,
          kind: entry.kind,
          recordingCount: entry.recordings.size,
        }))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { artists, loading, error };
};
