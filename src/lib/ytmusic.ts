// Server-only YouTube Music search adapter.

import YTMusic from "ytmusic-api";
import { YouTubeSearchResult } from "@/lib/youtube";
import { decodeHtmlEntities } from "../utils/htmlEntities.ts";

const SEARCH_TIMEOUT_MS = 4000;

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
    title: decodeHtmlEntities(song.name),
    channelTitle: decodeHtmlEntities(song.artist.name),
    thumbnail: song.thumbnails[0]?.url ?? "",
    searchCategory: "song",
    discoverySource: "ytmusic_search",
    artistId: song.artist.artistId ?? null,
    artistName: decodeHtmlEntities(song.artist.name),
    albumId: song.album?.albumId ?? null,
    albumName: song.album ? decodeHtmlEntities(song.album.name) : null,
    durationSeconds: song.duration ?? null,
    metadataFetchedAt: new Date().toISOString(),
  }));

  const videoResults: YouTubeSearchResult[] = videos.map((video) => ({
    videoId: video.videoId,
    title: decodeHtmlEntities(video.name),
    channelTitle: decodeHtmlEntities(video.artist.name),
    thumbnail: video.thumbnails[0]?.url ?? "",
    searchCategory: "video",
    discoverySource: "ytmusic_search",
    artistId: video.artist.artistId ?? null,
    artistName: decodeHtmlEntities(video.artist.name),
    albumId: null,
    albumName: null,
    durationSeconds: video.duration ?? null,
    metadataFetchedAt: new Date().toISOString(),
  }));

  return [...songResults, ...videoResults];
};
