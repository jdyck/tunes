import type {
  Artist,
  Recording,
  RecordingArtistCredit,
  RecordingYouTubeItem,
  SavedRecording,
  UserRecordingData,
  YouTubeItem,
  YouTubeSearchCategory,
} from "@/types/types";
// Relative, not the `@/` alias: this is a value import, and the test runner
// strips types without resolving tsconfig paths, so an aliased value import
// would fail at runtime under `npm test`.
import {
  recordingArtwork,
  type RecordingArtwork,
} from "../utils/recordingArtwork.ts";

interface RecordingAssociationRow {
  created_at: string;
  youtube_items: YouTubeItem | YouTubeItem[] | null;
}

interface RecordingArtistCreditRow
  extends Omit<RecordingArtistCredit, "artists"> {
  artists: Artist | Artist[] | null;
}

interface SavedRecordingRow extends UserRecordingData {
  recordings: (Omit<Recording, "recording_artist_credits"> & {
    recording_artist_credits?: RecordingArtistCreditRow[] | null;
    recording_youtube_items?: RecordingAssociationRow[] | null;
  }) | null;
}

const unwrapOne = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

// Song-category items ahead of video captures, then oldest association first.
// Shared so the Songs list and the Song detail header agree on which YouTube
// thumbnail a Recording falls back to.
const compareYouTubeItems = (
  a: { search_category: YouTubeSearchCategory; association_created_at: string },
  b: { search_category: YouTubeSearchCategory; association_created_at: string }
): number => {
  if (a.search_category !== b.search_category) {
    return a.search_category === "song" ? -1 : 1;
  }
  return a.association_created_at.localeCompare(b.association_created_at);
};

export const mapSavedRecordingRow = (
  row: SavedRecordingRow
): SavedRecording | null => {
  if (!row.recordings) return null;

  const {
    recording_artist_credits,
    recording_youtube_items,
    ...recording
  } = row.recordings;
  const recordingArtistCredits = (recording_artist_credits ?? [])
    .map((credit): RecordingArtistCredit => ({
      ...credit,
      artists: unwrapOne(credit.artists),
    }))
    .sort(
      (a, b) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
        (b.sort_order ?? Number.MAX_SAFE_INTEGER)
    );
  const youtubeItems = (recording_youtube_items ?? [])
    .map((association): RecordingYouTubeItem | null => {
      const item = unwrapOne(association.youtube_items);
      return item
        ? { ...item, association_created_at: association.created_at }
        : null;
    })
    .filter((item): item is RecordingYouTubeItem => item !== null)
    .sort(compareYouTubeItems);

  return {
    ...recording,
    recording_artist_credits: recordingArtistCredits,
    user_data: {
      user_id: row.user_id,
      recording_id: row.recording_id,
      notes: row.notes,
      rating: row.rating,
      sort_order: row.sort_order,
      tags: row.tags,
      key: row.key,
      tempo: row.tempo,
    },
    youtube_items: youtubeItems,
  };
};

export const savedRecordingSelect = `
  user_id,
  recording_id,
  notes,
  rating,
  sort_order,
  tags,
  key,
  tempo,
  recordings!inner(
    *,
    release_groups(id, title, musicbrainz_release_group_id),
    recording_artist_credits(
      recording_id,
      artist_id,
      role,
      credited_as,
      sort_order,
      artists(id, name, kind, musicbrainz_artist_id)
    ),
    recording_youtube_items(
      created_at,
      youtube_items(*)
    )
  )
`;

interface SongArtworkAssociationRow {
  created_at: string;
  youtube_items:
    | { video_id: string; search_category: YouTubeSearchCategory }
    | { video_id: string; search_category: YouTubeSearchCategory }[]
    | null;
}

interface SongArtworkRecording {
  song_id: string;
  musicbrainz_release_id: string | null;
  release_groups:
    | { musicbrainz_release_group_id: string }
    | { musicbrainz_release_group_id: string }[]
    | null;
  recording_youtube_items: SongArtworkAssociationRow[] | null;
}

// Every embedded relationship is typed as "or an array of itself" because
// PostgREST boxes a to-one embed depending on how it resolves the
// relationship, and `unwrapOne` exists to absorb that either way.
interface SongArtworkRow {
  recordings: SongArtworkRecording | SongArtworkRecording[] | null;
}

// A Song has no artwork of its own (ADR-0007), so the Songs list borrows its
// representative Recording's image the same way the Song detail header does.
// This select deliberately carries only the IDs the image URL is built from,
// because unlike detail it runs across the User's whole library at once.
export const songArtworkSelect = `
  sort_order,
  recordings!inner(
    song_id,
    musicbrainz_release_id,
    release_groups(musicbrainz_release_group_id),
    recording_youtube_items(
      created_at,
      youtube_items(video_id, search_category)
    )
  )
`;

// Reduces the flat Recording rows to one image per Song. Rows must arrive in
// the User's own `sort_order`, which makes the first row seen for a Song the
// representative one -- the same Recording the detail header picks.
export const mapSongArtworkRows = (
  rows: readonly SongArtworkRow[]
): Map<string, RecordingArtwork> => {
  const artworkBySong = new Map<string, RecordingArtwork>();

  for (const row of rows) {
    const recording = unwrapOne(row.recordings);
    if (!recording || artworkBySong.has(recording.song_id)) continue;

    const youtubeItems = (recording.recording_youtube_items ?? [])
      .map((association) => {
        const item = unwrapOne(association.youtube_items);
        return item
          ? { ...item, association_created_at: association.created_at }
          : null;
      })
      .filter(
        (
          item
        ): item is {
          video_id: string;
          search_category: YouTubeSearchCategory;
          association_created_at: string;
        } => item !== null
      )
      .sort(compareYouTubeItems);

    artworkBySong.set(
      recording.song_id,
      recordingArtwork({
        musicbrainz_release_id: recording.musicbrainz_release_id,
        release_groups: unwrapOne(recording.release_groups),
        youtube_items: youtubeItems,
      })
    );
  }

  return artworkBySong;
};
