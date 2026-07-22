import { NextRequest, NextResponse } from "next/server";
import { extractYouTubeID, fetchYouTubeVideoData } from "@/lib/youtube";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  const videoId = extractYouTubeID(
    request.nextUrl.searchParams.get("videoId")
  );
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube video ID." }, { status: 400 });
  }
  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YouTube metadata is not configured." },
      { status: 502 }
    );
  }

  const data = await fetchYouTubeVideoData(videoId, YOUTUBE_API_KEY);
  if (!data) {
    return NextResponse.json({ error: "YouTube video not found." }, { status: 404 });
  }
  return NextResponse.json(data);
}
