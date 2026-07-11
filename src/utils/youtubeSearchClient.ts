// src/utils/youtubeSearchClient.ts
//
// Thin client-side wrapper around the /api/youtube-search route, same
// pattern as recordingMetadataClient.ts.

import { YouTubeSearchResult } from "@/utils/youtube";

export type SearchPlatformId = "ytmusic" | "youtube";

export interface SearchPlatform {
  id: SearchPlatformId;
  label: string;
}

// Ordered list of search platforms offered in the Add Recording UI. Add
// new entries here as more platforms come online -- the selector and
// per-platform search state in AddRecordingModal are keyed off this list.
export const SEARCH_PLATFORMS: SearchPlatform[] = [
  { id: "ytmusic", label: "YouTube Music" },
  { id: "youtube", label: "YouTube" },
];

export interface YoutubeSearchPage {
  results: YouTubeSearchResult[];
  nextPageToken: string | null;
}

export const searchYoutube = async (
  query: string,
  platform: SearchPlatformId,
  pageToken?: string | null
): Promise<YoutubeSearchPage> => {
  const params = new URLSearchParams({ q: query, source: platform });
  if (pageToken) params.set("pageToken", pageToken);

  const response = await fetch(`/api/youtube-search?${params}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "YouTube search failed");
  }
  return data;
};
