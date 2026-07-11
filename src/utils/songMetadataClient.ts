// src/utils/songMetadataClient.ts
//
// Thin client-side wrappers around the /api/song-metadata routes, shared
// between AddSongModal and SongDetailContent.

import { SongWorkDetail, SongWorkSearchResult } from "@/utils/musicbrainz";
import { WorkBackground } from "@/utils/wikipedia";

export const searchSongMetadata = async (
  title: string
): Promise<SongWorkSearchResult[]> => {
  const response = await fetch(
    `/api/song-metadata/search?q=${encodeURIComponent(title)}`
  );
  if (!response.ok) throw new Error("Search failed");
  const data = await response.json();
  return data.results || [];
};

export const fetchWorkDetail = async (
  workId: string
): Promise<SongWorkDetail | null> => {
  const response = await fetch(`/api/song-metadata/work/${workId}`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.work || null;
};

export const fetchWorkBackground = async (
  workId: string
): Promise<WorkBackground | null> => {
  const response = await fetch(`/api/song-metadata/work/${workId}/background`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.background || null;
};

export interface SongWorkPreview {
  work: SongWorkDetail | null;
  background: WorkBackground | null;
}

// Fetches year/writers and Wikipedia background together in a single
// request -- used by AddSongModal's confirm screen, which needs both at
// once. See the /preview route for why this is one call instead of two.
export const fetchWorkPreview = async (
  workId: string
): Promise<SongWorkPreview> => {
  const response = await fetch(`/api/song-metadata/work/${workId}/preview`);
  if (!response.ok) return { work: null, background: null };
  const data = await response.json();
  return { work: data.work || null, background: data.background || null };
};
