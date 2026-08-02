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

const songUserDataFields = `
  user_id,
  song_id,
  notes,
  display_title,
  favorite,
  tags,
  created_at
`;

const sharedSongFields = `
    id,
    name,
    year,
    musicbrainz_work_id,
    is_discoverable,
    first_discoverable_at,
    song_artist_credits(
      artist_id,
      role,
      credited_as,
      sort_order,
      artists(id, name, kind, musicbrainz_artist_id)
    )
`;

// The Songs list fetches a User's whole library in one query -- it has no
// pagination, because search, sorting, and the tag facet counts are all
// computed across every Song. That makes per-row weight matter: it takes only
// the fields the rows actually draw. `wikipedia_extract` in particular is a
// paragraph of prose per Song that only the detail pane ever shows.
export const songListSelect = `
  ${songUserDataFields},
  songs!inner(${sharedSongFields})
`;

// Detail additionally needs the Wikipedia background it renders and the Work
// dates it writes back. The dates are not optional here: `useSongDetail.save`
// always sends `work_date_start`/`work_date_end` among the shared fields, so a
// select that omits them loads null and saves null over whatever the
// MusicBrainz sync stored.
export const songWithUserDataSelect = `
  ${songUserDataFields},
  songs!inner(
    ${sharedSongFields},
    wikipedia_extract,
    wikipedia_url,
    work_date_start,
    work_date_end
  )
`;
