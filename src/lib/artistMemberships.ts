import type { ArtistMembership } from "../types/artistMembership.ts";
import { musicBrainzArtistMemberships } from "../utils/artistMemberships.ts";
import {
  fetchMusicBrainzJson,
  isMusicBrainzNotFound,
} from "./musicbrainzTransport.ts";

export const fetchArtistMemberships = async (
  musicbrainzArtistId: string,
  fetchJson = fetchMusicBrainzJson,
): Promise<ArtistMembership[]> => {
  const url = new URL(
    `https://musicbrainz.org/ws/2/artist/${encodeURIComponent(musicbrainzArtistId)}`,
  );
  url.searchParams.set("fmt", "json");
  url.searchParams.set("inc", "artist-rels");
  try {
    return musicBrainzArtistMemberships(await fetchJson<unknown>(url));
  } catch (error) {
    if (isMusicBrainzNotFound(error)) return [];
    throw error;
  }
};
