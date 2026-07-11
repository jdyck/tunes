import { NextResponse } from "next/server";
import { fetchSongWork } from "@/utils/musicbrainz";
import { fetchBackgroundForWikidataId } from "@/utils/wikipedia";

// Combines the work detail (year, writers) and Wikipedia background lookups
// behind one request -- both are needed together for AddSongModal's confirm
// screen, and sharing the work's wikidataId (from fetchSongWork's url-rels)
// avoids a second MusicBrainz round trip that fetchWorkBackground would
// otherwise make on its own.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const work = await fetchSongWork(id);
    const background = work?.wikidataId
      ? await fetchBackgroundForWikidataId(work.wikidataId)
      : null;

    return NextResponse.json({ work, background });
  } catch (error) {
    console.error("Song preview lookup failed:", error);
    return NextResponse.json(
      { error: "Song preview lookup failed" },
      { status: 502 }
    );
  }
}
