import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import { isArtistMembershipCacheFresh } from "@/utils/artistMemberships";

export const useArtistMemberships = (artistId: string) => {
  const result = useQuery(api.artists.getMemberships, {
    artistId: artistId as Id<"artists">,
  });
  const started = useRef<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${artistId}:${result?.musicbrainz_artist_id}:${result?.fetched_at}:${attempt}`;
  const needsLookup = Boolean(
    result?.musicbrainz_artist_id &&
    !isArtistMembershipCacheFresh(result.fetched_at),
  );

  useEffect(() => {
    if (!needsLookup || started.current === key) return;
    started.current = key;
    void fetch(`/api/artist-metadata/artist/${artistId}/memberships`, {
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Membership lookup failed");
      })
      .catch(() => setFailedKey(key));
  }, [artistId, key, needsLookup]);

  return {
    memberships: result?.memberships ?? [],
    loading: result === undefined || (needsLookup && failedKey !== key),
    error: needsLookup && failedKey === key,
    retry: () => setAttempt((value) => value + 1),
  };
};
