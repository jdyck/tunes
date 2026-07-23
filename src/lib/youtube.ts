// src/lib/youtube.ts

import type {
  YouTubeDiscoverySource,
  YouTubeSearchCategory,
} from "@/types/types";
import { decodeHtmlEntities } from "../utils/htmlEntities.ts";

// Converts YouTube's ISO 8601 duration (e.g. "PT4M13S") to "m:ss"
export const formatYouTubeDuration = (isoDuration: string) => {
  const seconds = parseYouTubeDurationSeconds(isoDuration);
  return seconds == null ? null : formatDurationSeconds(seconds);
};

export const parseYouTubeDurationSeconds = (isoDuration: string) => {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

// Converts a raw seconds count (e.g. from ytmusic-api) to "m:ss"
export const formatDurationSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const fetchYouTubeVideoData = async (
  videoId: string,
  apiKey: string
) => {
  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const video = data.items[0];
      return {
        title: decodeHtmlEntities(video.snippet.title),
        channelTitle: decodeHtmlEntities(video.snippet.channelTitle),
        durationSeconds: parseYouTubeDurationSeconds(
          video.contentDetails.duration
        ),
        metadataFetchedAt: new Date().toISOString(),
      };
    } else {
      throw new Error("No video found for the given ID");
    }
  } catch (error) {
    console.error("Error fetching YouTube video data:", error);
    return null;
  }
};

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  searchCategory: YouTubeSearchCategory;
  discoverySource: Exclude<YouTubeDiscoverySource, "legacy_recording_url">;
  artistId?: string | null;
  artistName?: string | null;
  albumId?: string | null;
  albumName?: string | null;
  durationSeconds?: number | null;
  metadataFetchedAt?: string | null;
}

export interface YouTubeSearchPage {
  results: YouTubeSearchResult[];
  nextPageToken: string | null;
}

// Fetches one page (up to 50, search.list's max) at a time. Pass the
// previous call's nextPageToken to fetch the next 50 on demand, e.g. from
// a "Load more" button, rather than always spending extra quota up front.
export const searchYouTubeVideos = async (
  query: string,
  apiKey: string,
  pageToken?: string
): Promise<YouTubeSearchPage> => {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=50&q=${encodeURIComponent(
    query
  )}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ""}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items) {
      return { results: [], nextPageToken: null };
    }

    const results = data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: decodeHtmlEntities(item.snippet.title),
      channelTitle: decodeHtmlEntities(item.snippet.channelTitle),
      thumbnail: item.snippet.thumbnails?.default?.url ?? "",
      searchCategory: item.snippet.channelTitle.endsWith(" - Topic")
        ? "song"
        : "video",
      discoverySource: "youtube_search",
    }));

    return { results, nextPageToken: data.nextPageToken ?? null };
  } catch (error) {
    console.error("Error searching YouTube videos:", error);
    return { results: [], nextPageToken: null };
  }
};

export const extractYouTubeID = (url: string | null | undefined) => {
  if (!url) return null;
  const trimmed = url.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:embed\/|v\/|shorts\/|watch\?[^# ]*v=)|youtu\.be\/)([A-Za-z0-9_-]{11})/i
  );
  return match?.[1] ?? null;
};

export const youtubeThumbnailUrl = (videoId: string) =>
  `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

export const mergeSearchCategory = (
  current: YouTubeSearchCategory,
  incoming: YouTubeSearchCategory
): YouTubeSearchCategory =>
  current === "song" || incoming === "song" ? "song" : "video";

export const mergeDiscoverySources = (
  current: YouTubeDiscoverySource[],
  incoming: YouTubeDiscoverySource[]
) => Array.from(new Set([...current, ...incoming])).sort();

export const preferNonNull = <T>(current: T | null, incoming: T | null) =>
  incoming ?? current;
