import { NextRequest, NextResponse } from "next/server";
import { fetchRecordingMatch } from "@/lib/musicbrainz";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const recording = await fetchRecordingMatch(
      id,
      request.nextUrl.searchParams.get("workId")
    );
    return NextResponse.json({ recording });
  } catch (error) {
    console.error("Recording metadata lookup failed:", error);
    return NextResponse.json(
      { error: "Recording metadata lookup failed" },
      { status: 502 }
    );
  }
}
