import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Artist } from "@/types/types";

const artistSelect =
  "id, name, kind, musicbrainz_artist_id, wikidata_id, image_url, image_source_url, image_license, image_lookup_completed_at";

export const useArtistIdentity = (artistId: string) => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("artists")
      .select(artistSelect)
      .eq("id", artistId)
      .single();
    if (queryError) {
      setError(`Error fetching Artist: ${queryError.message}`);
      setLoading(false);
      return;
    }

    let resolved = data as Artist;
    setArtist(resolved);
    setLoading(false);
    if (resolved.image_lookup_completed_at) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;

    try {
      const response = await fetch(`/api/artist-metadata/artist/${artistId}/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Image lookup failed");
      const result = await response.json();
      resolved = { ...resolved, ...result.artist };
      setArtist(resolved);
    } catch (lookupError) {
      // Transient upstream failures remain uncached and retry on a later view.
      console.error("Artist image lookup failed:", lookupError);
    }
  }, [artistId]);

  useEffect(() => {
    load();
  }, [load]);

  return { artist, loading, error };
};
