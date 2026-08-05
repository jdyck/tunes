import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { mapSavedRecordingRow } from "@/lib/recordings";
import { ArtistKind, SavedRecording } from "@/types/types";

export interface ArtistIdentity {
  id: string;
  name: string;
  kind: ArtistKind | null;
  musicbrainz_artist_id: string | null;
}

// The user's saved recordings that credit this artist as a performer. The
// !inner join on recording_artist_credits filters recordings down to those
// with a matching performer credit; the embedded artists row also lets us
// resolve the artist's name/kind for performer-only artists (those with no
// writer credit, so absent from the loaded Songs).
const artistRecordingSelect = `
  user_id,
  recording_id,
  notes,
  rating,
  sort_order,
  tags,
  key,
  tempo,
  recordings!inner(
    *,
    release_groups(id, title, musicbrainz_release_group_id),
    recording_artist_credits!inner(
      recording_id,
      artist_id,
      role,
      credited_as,
      sort_order,
      artists(id, name, kind, musicbrainz_artist_id)
    ),
    recording_youtube_items(
      created_at,
      youtube_items(*)
    )
  )
`;

export const useArtistRecordings = (artistId: string) => {
  const [recordings, setRecordings] = useState<SavedRecording[]>([]);
  const [artist, setArtist] = useState<ArtistIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!artistId) {
      setRecordings([]);
      setArtist(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("user_recording_data")
      .select(artistRecordingSelect)
      .eq("recordings.recording_artist_credits.artist_id", artistId)
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

    // The embedded credits are already filtered to this artist by the query,
    // so the first match gives the artist's canonical name/kind.
    let identity: ArtistIdentity | null = null;
    for (const row of (data ?? []) as unknown as {
      recordings: {
        recording_artist_credits:
          | { artist_id: string; artists: ArtistIdentity | null }[]
          | null;
      } | null;
    }[]) {
      const match = (row.recordings?.recording_artist_credits ?? []).find(
        (credit) => credit.artist_id === artistId && credit.artists
      );
      if (match?.artists) {
        identity = {
          id: match.artists.id,
          name: match.artists.name,
          kind: match.artists.kind ?? null,
          musicbrainz_artist_id:
            match.artists.musicbrainz_artist_id ?? null,
        };
        break;
      }
    }
    setArtist(identity);
    setLoading(false);
  }, [artistId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { recordings, artist, loading, error, refresh };
};
