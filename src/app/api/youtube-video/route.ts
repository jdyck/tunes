import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeID, fetchYouTubeVideoData } from "@/lib/youtube";
import { fetchYtMusicVideoData } from "@/lib/ytmusic";
import { auth } from "@clerk/nextjs/server";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  await auth.protect();
  const videoId = extractYouTubeID(
    request.nextUrl.searchParams.get("videoId")
  );
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube video ID." }, { status: 400 });
  }

  const [official, ytmusic] = await Promise.all([
    YOUTUBE_API_KEY
      ? fetchYouTubeVideoData(videoId, YOUTUBE_API_KEY)
      : Promise.resolve(null),
    fetchYtMusicVideoData(videoId),
  ]);
  if (!official && !ytmusic) {
    return NextResponse.json({ error: "YouTube video not found." }, { status: 404 });
  }

  return NextResponse.json({
    title: official?.title || ytmusic?.title || "",
    channelTitle: official?.channelTitle || ytmusic?.artistName || "",
    description: official?.description ?? null,
    durationSeconds:
      official?.durationSeconds ?? ytmusic?.durationSeconds ?? null,
    metadataFetchedAt:
      official?.metadataFetchedAt ??
      ytmusic?.metadataFetchedAt ??
      new Date().toISOString(),
    ytmusicArtistId: ytmusic?.artistId ?? null,
    ytmusicArtistName: ytmusic?.artistName ?? null,
    ytmusicAlbumId: ytmusic?.albumId ?? null,
    ytmusicAlbumName: ytmusic?.albumName ?? null,
  });
}
