import {
  Recording,
  RecordingYouTubeItem,
  SavedRecording,
  UserRecordingData,
  YouTubeItem,
} from "@/types/types";

interface RecordingAssociationRow {
  created_at: string;
  youtube_items: YouTubeItem | YouTubeItem[] | null;
}

interface SavedRecordingRow extends UserRecordingData {
  recordings: (Recording & {
    recording_youtube_items?: RecordingAssociationRow[] | null;
  }) | null;
}

const unwrapOne = <T>(value: T | T[] | null): T | null =>
  Array.isArray(value) ? value[0] ?? null : value;

export const mapSavedRecordingRow = (
  row: SavedRecordingRow
): SavedRecording | null => {
  if (!row.recordings) return null;

  const { recording_youtube_items, ...recording } = row.recordings;
  const youtubeItems = (recording_youtube_items ?? [])
    .map((association): RecordingYouTubeItem | null => {
      const item = unwrapOne(association.youtube_items);
      return item
        ? { ...item, association_created_at: association.created_at }
        : null;
    })
    .filter((item): item is RecordingYouTubeItem => item !== null)
    .sort((a, b) => {
      if (a.search_category !== b.search_category) {
        return a.search_category === "song" ? -1 : 1;
      }
      return a.association_created_at.localeCompare(b.association_created_at);
    });

  return {
    ...recording,
    user_data: {
      user_id: row.user_id,
      recording_id: row.recording_id,
      notes: row.notes,
      rating: row.rating,
      sort_order: row.sort_order,
      tags: row.tags,
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
  recordings!inner(
    *,
    recording_youtube_items(
      created_at,
      youtube_items(*)
    )
  )
`;
