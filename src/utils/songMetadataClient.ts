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
