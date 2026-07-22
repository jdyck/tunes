import { NextRequest, NextResponse } from "next/server";
import { searchYtMusic } from "@/lib/ytmusic";
import { searchYouTubeVideos } from "@/lib/youtube";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const source = request.nextUrl.searchParams.get("source");
  const pageToken =
    request.nextUrl.searchParams.get("pageToken") || undefined;

  if (!query) {
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });
  }

  if (source === "ytmusic") {
    try {
      const results = await searchYtMusic(query);
      return NextResponse.json({ results, nextPageToken: null });
    } catch (error) {
      console.error("ytmusic-api search failed:", error);
      return NextResponse.json(
        { error: "YouTube Music search isn't working right now." },
        { status: 503 }
      );
    }
  }

  if (source !== "youtube") {
    return NextResponse.json(
      { error: "Missing or invalid source param" },
      { status: 400 }
    );
  }

  if (!YOUTUBE_API_KEY) {
    return NextResponse.json(
      { error: "YouTube search is not configured." },
      { status: 502 }
    );
  }

  const { results, nextPageToken: token } = await searchYouTubeVideos(
    query,
    YOUTUBE_API_KEY,
    pageToken
  );
  return NextResponse.json({ results, nextPageToken: token });
}
