import { NextResponse } from "next/server";
import { fetchSongWorkYear } from "@/utils/musicbrainz";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const year = await fetchSongWorkYear(id);
    return NextResponse.json({ year });
  } catch (error) {
    console.error("Song metadata year lookup failed:", error);
    return NextResponse.json(
      { error: "Song metadata year lookup failed" },
      { status: 502 }
    );
  }
}
