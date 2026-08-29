import { NextResponse } from "next/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Id } from "@/../convex/_generated/dataModel";
import { api } from "@/../convex/_generated/api";
import { fetchArtistMemberships } from "@/lib/artistMemberships";
import { isArtistMembershipCacheFresh } from "@/utils/artistMemberships";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await auth.protect();
  const token = await authResult.getToken();
  if (!token)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const artistId = id as Id<"artists">;
  const existing = await fetchQuery(
    api.artists.getMemberships,
    { artistId },
    { token },
  );
  if (!existing)
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  if (
    !existing.musicbrainz_artist_id ||
    isArtistMembershipCacheFresh(existing.fetched_at)
  ) {
    return NextResponse.json({ ok: true });
  }

  try {
    const memberships = await fetchArtistMemberships(
      existing.musicbrainz_artist_id,
    );
    await fetchMutation(
      api.artists.cacheMemberships,
      {
        artistId,
        musicbrainzArtistId: existing.musicbrainz_artist_id,
        memberships,
      },
      { token },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Keep the last successful snapshot; transient errors are never cached as an empty list.
    console.error("Artist membership lookup failed:", error);
    return NextResponse.json(
      { error: "Artist membership lookup failed" },
      { status: 502 },
    );
  }
}
