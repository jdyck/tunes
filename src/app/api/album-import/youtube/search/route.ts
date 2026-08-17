import { NextRequest, NextResponse } from "next/server";
import { searchYtMusicAlbums } from "@/lib/ytmusic";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  await auth.protect();
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });
  try {
    return NextResponse.json({ albums: await searchYtMusicAlbums(query) });
  } catch (error) {
    console.error("YouTube Music album search failed:", error);
    return NextResponse.json({ error: "Album search failed" }, { status: 502 });
  }
}
