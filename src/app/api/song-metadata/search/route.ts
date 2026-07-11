import { NextRequest, NextResponse } from "next/server";
import { searchSongWorks } from "@/utils/musicbrainz";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });
  }

  try {
    const results = await searchSongWorks(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Song metadata search failed:", error);
    return NextResponse.json(
      { error: "Song metadata search failed" },
      { status: 502 }
    );
  }
}
