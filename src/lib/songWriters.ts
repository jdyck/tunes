// src/lib/songWriters.ts

import { supabase } from "@/lib/supabaseClient";
import type {
  Artist,
  SongArtistCredit,
  SongArtistCreditInput,
  SongArtistCreditRole,
} from "@/types/types";

export type WriterInput = SongArtistCreditInput;

interface SongArtistCreditRow {
  artist_id: string;
  role: SongArtistCreditRole;
  credited_as: string;
  sort_order: number | null;
  artists: Artist | Artist[] | null;
}

const unwrapArtist = (value: Artist | Artist[] | null): Artist | null =>
  Array.isArray(value) ? value[0] ?? null : value;

export const fetchSongWriters = async (
  songId: string
): Promise<WriterInput[]> => {
  const { data, error } = await supabase
    .from("song_artist_credits")
    .select(
      "artist_id, role, credited_as, sort_order, artists(id, name, kind, musicbrainz_artist_id)"
    )
    .eq("song_id", songId)
    .order("sort_order");

  if (error) throw error;

  return ((data || []) as unknown as SongArtistCreditRow[]).flatMap((row) => {
    const artist = unwrapArtist(row.artists);
    if (!artist) return [];

    return [
      {
        artistId: row.artist_id,
        canonicalName: artist.name,
        creditedAs: row.credited_as || artist.name,
        role: row.role,
        artistKind: artist.kind ?? null,
        musicbrainzArtistId: artist.musicbrainz_artist_id ?? null,
      },
    ];
  });
};

export const saveSongWriters = async (
  songId: string,
  writers: WriterInput[]
): Promise<WriterInput[]> => {
  const credits = writers
    .filter((writer) => writer.creditedAs.trim())
    .map((writer) => ({
      artist_id: writer.artistId || null,
      canonical_name:
        writer.canonicalName?.trim() || writer.creditedAs.trim(),
      credited_as: writer.creditedAs.trim(),
      role: writer.role,
      artist_kind: writer.artistKind || null,
      musicbrainz_artist_id: writer.musicbrainzArtistId || null,
    }));

  const { error } = await supabase.rpc("replace_song_artist_credits", {
    p_song_id: songId,
    p_credits: credits,
  });
  if (error) throw error;

  return fetchSongWriters(songId);
};

export const formatWriterCredit = (
  credits: Pick<SongArtistCredit, "credited_as" | "artists">[]
): string | null => {
  const names = credits
    .map((credit) => credit.credited_as || credit.artists?.name)
    .filter((name): name is string => Boolean(name));
  const credited = Array.from(new Set(names));

  return credited.length > 0 ? credited.join(", ") : null;
};
