import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import { fetchArtistImageMetadata } from "@/lib/artistImages";
import { auth } from "@clerk/nextjs/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await auth.protect();
  const token = await authResult.getToken();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const artistId = id as Id<"artists">;
  const artist = await fetchQuery(
    api.artists.getIdentity,
    { artistId },
    { token },
  );
  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }
  if (artist.image_lookup_completed_at) {
    return NextResponse.json({ artist });
  }

  try {
    const image = artist.musicbrainz_artist_id
      ? await fetchArtistImageMetadata(artist.musicbrainz_artist_id)
      : { wikidataId: null, imageUrl: null, sourceUrl: null, license: null };
    const updated = await fetchMutation(
      api.artists.cacheImage,
      {
        artistId,
        wikidataId: image.wikidataId,
        imageUrl: image.imageUrl,
        sourceUrl: image.sourceUrl,
        license: image.license,
      },
      { token },
    );
    return NextResponse.json({ artist: updated });
  } catch (error) {
    console.error("Artist image lookup failed:", error);
    return NextResponse.json({ error: "Artist image lookup failed" }, { status: 502 });
  }
}
