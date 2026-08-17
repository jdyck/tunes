import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import type { Artist } from "@/types/types";

export const useArtistDetail = (artistId: string) => {
  const result = useQuery(api.artists.getMine, {
    artistId: artistId as Id<"artists">,
  });
  const [imageArtist, setImageArtist] = useState<Artist | null>(null);
  const lookupStartedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!result?.artist || result.artist.image_lookup_completed_at) return;
    if (lookupStartedFor.current === artistId) return;
    lookupStartedFor.current = artistId;

    void fetch(`/api/artist-metadata/artist/${artistId}/image`, {
      method: "POST",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Image lookup failed");
        return response.json() as Promise<{ artist: Artist }>;
      })
      .then(({ artist }) => setImageArtist(artist))
      .catch((error) => {
        // Transient upstream failures remain uncached and retry on a later view.
        console.error("Artist image lookup failed:", error);
      });
  }, [artistId, result?.artist]);

  const artist =
    imageArtist?.id === artistId ? imageArtist : (result?.artist ?? null);
  return {
    artist,
    songs: result?.songs ?? [],
    recordings: result?.recordings ?? [],
    recordingSongTitles: result?.recording_song_titles ?? [],
    userData: result?.user_data ?? null,
    loading: result === undefined,
  };
};
