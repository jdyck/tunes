// src/utils/ytmusic.ts
//
// Server-only: calls YouTube Music's unofficial internal search endpoint via
// the `ytmusic-api` package (Node-only, not browser-safe). Used as the
// primary source for Recording search before falling back to the official
// YouTube Data API -- see src/app/api/youtube-search/route.ts.

import YTMusic from "ytmusic-api";
import { YouTubeSearchResult, formatDurationSeconds } from "@/utils/youtube";

const SEARCH_TIMEOUT_MS = 4000;

// A broken/blocked scraper is more likely to hang than reject cleanly, so
// every call into the client is raced against this timeout rather than
// trusted to fail fast on its own.
const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("ytmusic-api request timed out")),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

let clientPromise: Promise<YTMusic> | null = null;

// Lazily creates and initializes a single client, reused across requests.
// Reset on init failure so a later call gets a fresh attempt instead of
// reusing a permanently-rejected promise.
const getClient = (): Promise<YTMusic> => {
  if (!clientPromise) {
    const client = new YTMusic();
    clientPromise = client.initialize().then(
      () => client,
      (error) => {
        clientPromise = null;
        throw error;
      }
    );
  }
  return clientPromise;
};

// Searches YouTube Music for both songs and videos, mapped into the same
// YouTubeSearchResult shape the official Data API search returns (see
// searchYouTubeVideos in youtube.ts), so callers don't need to know which
// source served a given result. isMusic comes from YouTube Music's own
// content type here, rather than the "- Topic" channel-name guess the Data
// API path relies on.
export const searchYtMusic = async (
  query: string
): Promise<YouTubeSearchResult[]> => {
  const client = await withTimeout(getClient(), SEARCH_TIMEOUT_MS);
  const [songs, videos] = await withTimeout(
    Promise.all([client.searchSongs(query), client.searchVideos(query)]),
    SEARCH_TIMEOUT_MS
  );

  const songResults: YouTubeSearchResult[] = songs.map((song) => ({
    videoId: song.videoId,
    title: song.name,
    channelTitle: song.artist.name,
    thumbnail: song.thumbnails[0]?.url ?? "",
    isMusic: true,
    album: song.album?.name ?? null,
    duration:
      song.duration != null ? formatDurationSeconds(song.duration) : null,
  }));

  const videoResults: YouTubeSearchResult[] = videos.map((video) => ({
    videoId: video.videoId,
    title: video.name,
    channelTitle: video.artist.name,
    thumbnail: video.thumbnails[0]?.url ?? "",
    isMusic: false,
    album: null,
    duration:
      video.duration != null ? formatDurationSeconds(video.duration) : null,
  }));

  return [...songResults, ...videoResults];
};
