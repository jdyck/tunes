import { NextResponse } from "next/server";
import { fetchYtMusicAlbum } from "@/lib/ytmusic";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await auth.protect();
  const { id } = await params;
  try {
    return NextResponse.json({ album: await fetchYtMusicAlbum(id) });
  } catch (error) {
    console.error("YouTube Music album lookup failed:", error);
    return NextResponse.json({ error: "Album lookup failed" }, { status: 502 });
  }
}
