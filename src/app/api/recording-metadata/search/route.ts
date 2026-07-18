import { NextRequest, NextResponse } from "next/server";
import { searchRecordingMatches } from "@/lib/musicbrainz";

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title")?.trim();
  const artist = request.nextUrl.searchParams.get("artist")?.trim() || null;
  const duration = request.nextUrl.searchParams.get("duration")?.trim() || null;
  const album = request.nextUrl.searchParams.get("album")?.trim() || null;

  if (!title) {
    return NextResponse.json({ error: "Missing title param" }, { status: 400 });
  }

  try {
    const results = await searchRecordingMatches(title, artist, duration, album);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Recording metadata search failed:", error);
    return NextResponse.json(
      { error: "Recording metadata search failed" },
      { status: 502 }
    );
  }
}
