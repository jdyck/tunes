import { NextRequest, NextResponse } from "next/server";
import { searchMusicBrainzReleases } from "@/lib/musicbrainz";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  await auth.protect();
  const title = request.nextUrl.searchParams.get("title")?.trim();
  const artist = request.nextUrl.searchParams.get("artist")?.trim() || null;
  if (!title) return NextResponse.json({ error: "Missing title" }, { status: 400 });
  try {
    return NextResponse.json({ releases: await searchMusicBrainzReleases(title, artist) });
  } catch (error) {
    console.error("MusicBrainz release search failed:", error);
    return NextResponse.json({ error: "Release search failed" }, { status: 502 });
  }
}
