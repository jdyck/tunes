import { NextResponse } from "next/server";
import { fetchYtMusicAlbum } from "@/lib/ytmusic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    return NextResponse.json({ album: await fetchYtMusicAlbum(id) });
  } catch (error) {
    console.error("YouTube Music album lookup failed:", error);
    return NextResponse.json({ error: "Album lookup failed" }, { status: 502 });
  }
}
