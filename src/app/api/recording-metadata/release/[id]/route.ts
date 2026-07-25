import { NextResponse } from "next/server";
import { fetchReleaseTracklist } from "@/lib/musicbrainz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const tracks = await fetchReleaseTracklist(id);
    return tracks
      ? NextResponse.json({ tracks })
      : NextResponse.json({ error: "Release not found" }, { status: 404 });
  } catch (error) {
    console.error("MusicBrainz release tracklist lookup failed:", error);
    return NextResponse.json(
      { error: "Release tracklist lookup failed" },
      { status: 502 }
    );
  }
}
