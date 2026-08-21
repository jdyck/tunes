import type {
  Artist,
  Recording,
  RecordingPersonnelEntry,
  RecordingYouTubeItem,
  SavedRecording,
  UserRecordingData,
  YouTubeItem,
  YouTubeSearchCategory,
} from "@/types/types";

interface RecordingAssociationRow {
  created_at: string;
  youtube_items: YouTubeItem | YouTubeItem[] | null;
}

interface RecordingArtistCreditRow {
  recording_id: string;
  artist_id: string;
  role: "performer";
  credited_as: string;
  sort_order?: number | null;
  artists: Artist | Artist[] | null;
}

interface SavedRecordingRow extends UserRecordingData {
  recordings: (Recording & {
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
  const personnel = (recording_artist_credits ?? [])
    .map((credit): RecordingPersonnelEntry => ({
      recording_id: credit.recording_id,
      artist_id: credit.artist_id,
      credited_as: credit.credited_as,
      sort_order: credit.sort_order,
      relationships: [{ type: "performer", details: [] }],
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
    personnel,
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
