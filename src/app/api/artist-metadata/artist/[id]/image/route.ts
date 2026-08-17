import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchArtistImageMetadata } from "@/lib/artistImages";
import { auth } from "@clerk/nextjs/server";

const artistImageSelect =
  "id, musicbrainz_artist_id, wikidata_id, image_url, image_source_url, image_license, image_lookup_completed_at";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await auth.protect();
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Artist image lookup is missing Supabase server credentials");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { data: artist, error: artistError } = await admin
    .from("artists")
    .select(artistImageSelect)
    .eq("id", id)
    .single();
  if (artistError || !artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }
  if (artist.image_lookup_completed_at) {
    return NextResponse.json({ artist });
  }

  try {
    const image = artist.musicbrainz_artist_id
      ? await fetchArtistImageMetadata(artist.musicbrainz_artist_id)
      : { wikidataId: null, imageUrl: null, sourceUrl: null, license: null };
    const { data: updated, error: updateError } = await admin
      .from("artists")
      .update({
        wikidata_id: image.wikidataId,
        image_url: image.imageUrl,
        image_source_url: image.sourceUrl,
        image_license: image.license,
        image_lookup_completed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .is("image_lookup_completed_at", null)
      .select(artistImageSelect)
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) return NextResponse.json({ artist: updated });

    const { data: concurrentResult, error: concurrentError } = await admin
      .from("artists")
      .select(artistImageSelect)
      .eq("id", id)
      .single();
    if (concurrentError) throw concurrentError;
    return NextResponse.json({ artist: concurrentResult });
  } catch (error) {
    console.error("Artist image lookup failed:", error);
    return NextResponse.json({ error: "Artist image lookup failed" }, { status: 502 });
  }
}
