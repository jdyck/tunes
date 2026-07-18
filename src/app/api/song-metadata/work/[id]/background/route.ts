import { NextResponse } from "next/server";
import { fetchWorkBackground } from "@/lib/wikipedia";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const background = await fetchWorkBackground(id);
    return NextResponse.json({ background });
  } catch (error) {
    console.error("Song background lookup failed:", error);
    return NextResponse.json(
      { error: "Song background lookup failed" },
      { status: 502 }
    );
  }
}
