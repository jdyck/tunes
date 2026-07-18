import { NextResponse } from "next/server";
import { fetchSongWork } from "@/lib/musicbrainz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const work = await fetchSongWork(id);
    return NextResponse.json({ work });
  } catch (error) {
    console.error("Song metadata work lookup failed:", error);
    return NextResponse.json(
      { error: "Song metadata work lookup failed" },
      { status: 502 }
    );
  }
}
