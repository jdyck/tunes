import {
  Song,
  SongUserData,
  SongWithUserData,
} from "@/types/types";

interface SongUserDataRow extends SongUserData {
  songs: Song | Song[] | null;
}

const unwrapOne = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

export const mapSongUserDataRow = (
  row: SongUserDataRow
): SongWithUserData | null => {
  const song = unwrapOne(row.songs);
  if (!song) return null;

  const { songs: _songs, ...userData } = row;
  return { ...song, user_data: userData };
};

export const songWithUserDataSelect = `
  user_id,
  song_id,
  notes,
  display_title,
  created_at,
  songs!inner(
    id,
    name,
    year,
    wikipedia_extract,
    wikipedia_url,
    musicbrainz_work_id,
    is_discoverable,
    first_discoverable_at,
    song_writers(role, sort_order, people(name))
  )
`;
