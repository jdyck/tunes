import type { RecordingPerformer } from "../lib/musicbrainz.ts";
import type { RecordingKind, SavedRecording } from "../types/types.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";
import {
  performerCreditsToDraft,
  performersToSavePayload,
  type RecordingPerformerPayload,
} from "./recordingPerformers.ts";

export interface RecordingDraftReleaseGroup {
  title: string;
  musicbrainzReleaseGroupId: string;
}

export interface RecordingDraft {
  name: string;
  kind: RecordingKind;
  notes: string;
  artist: string;
  album: string;
  year: string;
  recordingDateStart: string;
  recordingDateEnd: string;
  recordingLocation: string;
  duration: string;
  key: string;
  tempo: string;
  tags: string;
  musicbrainzRecordingId: string | null;
  musicbrainzReleaseId: string | null;
  releaseGroup: RecordingDraftReleaseGroup | null;
  performers: RecordingPerformer[];
}

export interface RecordingEditorState {
  baseline: RecordingDraft;
  draft: RecordingDraft;
}

export interface RecordingSavePayload {
  shared: {
    name: string;
    kind: RecordingKind;
    artist: string | null;
    album: string | null;
    year: string | null;
    duration: string | null;
    musicbrainz_recording_id: string | null;
    musicbrainz_release_id: string | null;
    recording_date_start: string | null;
    recording_date_end: string | null;
    recording_location: string | null;
    release_group: {
      title: string;
      musicbrainz_release_group_id: string;
    } | null;
    performers: RecordingPerformerPayload[];
  };
  private: {
    key: string | null;
    tempo: string | null;
    notes: string | null;
    rating: number | null;
    sort_order: number | null;
    tags: string[];
  };
}

const usableYouTubeAlbumName = (value: string | null | undefined) => {
  const albumName = value?.trim();
  return albumName && albumName.toLowerCase() !== "unknown" ? albumName : "";
};

const loadedDraft = (recording: SavedRecording): RecordingDraft => ({
  name: recording.name || "",
  kind: recording.kind || "video_capture",
  notes: recording.user_data.notes || "",
  artist: recording.artist || "",
  album: recording.release_groups?.title || recording.album || "",
  year: recording.year || "",
  recordingDateStart: recording.recording_date_start || "",
  recordingDateEnd: recording.recording_date_end || "",
  recordingLocation: recording.recording_location || "",
  duration: recording.duration || "",
  key: recording.user_data.key || "",
  tempo:
    recording.user_data.tempo != null
      ? String(recording.user_data.tempo)
      : "",
  tags: (recording.user_data.tags || []).join(", "),
  musicbrainzRecordingId: recording.musicbrainz_recording_id || null,
  musicbrainzReleaseId: recording.musicbrainz_release_id || null,
  releaseGroup: recording.release_groups
    ? {
        title: recording.release_groups.title,
        musicbrainzReleaseGroupId:
          recording.release_groups.musicbrainz_release_group_id,
      }
    : null,
  performers: performerCreditsToDraft(
    recording.recording_artist_credits ?? []
  ),
});

export const recordingToEditorState = (
  recording: SavedRecording
): RecordingEditorState => {
  const baseline = loadedDraft(recording);
  const fallbackAlbum =
    baseline.album ||
    recording.youtube_items
      .map((item) => usableYouTubeAlbumName(item.ytmusic_album_name))
      .find(Boolean) ||
    "";

  return {
    baseline,
    draft: {
      ...baseline,
      name: decodeHtmlEntities(baseline.name),
      artist: decodeHtmlEntities(baseline.artist),
      album: decodeHtmlEntities(fallbackAlbum),
    },
  };
};

export const recordingDraftIsDirty = (
  state: RecordingEditorState
): boolean => JSON.stringify(state.draft) !== JSON.stringify(state.baseline);

export const recordingDraftDidSave = (
  state: RecordingEditorState,
  savedDraft: RecordingDraft
): RecordingEditorState => ({
  baseline: savedDraft,
  draft: state.draft,
});

export const recordingDraftToPayload = (
  recording: SavedRecording,
  draft: RecordingDraft
): RecordingSavePayload => ({
  shared: {
    name: draft.name,
    kind: draft.kind,
    artist: draft.artist || null,
    album: draft.album || null,
    year: draft.year || null,
    duration: draft.duration || null,
    musicbrainz_recording_id: draft.musicbrainzRecordingId,
    musicbrainz_release_id: draft.musicbrainzReleaseId,
    recording_date_start: draft.recordingDateStart || null,
    recording_date_end: draft.recordingDateEnd || null,
    recording_location: draft.recordingLocation || null,
    release_group: draft.releaseGroup
      ? {
          title: draft.releaseGroup.title,
          musicbrainz_release_group_id:
            draft.releaseGroup.musicbrainzReleaseGroupId,
        }
      : null,
    performers: performersToSavePayload(draft.performers),
  },
  private: {
    key: draft.key || null,
    tempo: draft.tempo || null,
    notes: draft.notes || null,
    rating: recording.user_data.rating ?? null,
    sort_order: recording.user_data.sort_order ?? null,
    tags: draft.tags
      ? draft.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [],
  },
});
