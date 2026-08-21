import type { ResolvedRecordingMatch } from "../lib/musicbrainz.ts";
import type { RecordingAttributionInput } from "./musicbrainzRecordingAttribution.ts";
import type { RecordingKind, SavedRecording } from "../types/types.ts";
import { decodeHtmlEntities } from "./htmlEntities.ts";
import {
  personnelEntriesToDraft,
  personnelEntriesToSavePayload,
  type RecordingPersonnelDraftEntry,
  type RecordingPersonnelPayload,
} from "./recordingPersonnel.ts";
import {
  attributionCreditsToDraft,
  attributionsToSavePayload,
  type RecordingAttributionPayload,
} from "./recordingAttributions.ts";

export interface RecordingDraftReleaseGroup {
  title: string;
  musicbrainzReleaseGroupId: string;
  attribution: RecordingAttributionInput[];
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
  attribution: RecordingAttributionInput[];
  personnel: RecordingPersonnelDraftEntry[];
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
      attribution: RecordingAttributionPayload[];
    } | null;
    attribution: RecordingAttributionPayload[];
    personnel: RecordingPersonnelPayload[];
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
  artist: recording.artist_attribution_fallback || "",
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
        attribution: attributionCreditsToDraft(
          recording.release_groups.artist_attributions ?? [],
        ),
      }
    : null,
  attribution: attributionCreditsToDraft(
    recording.recording_artist_attributions ?? [],
  ),
  personnel: personnelEntriesToDraft(recording.personnel ?? []),
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

export const recordingEditorStateAfterSave = (
  state: RecordingEditorState,
  savedRecording: SavedRecording,
  saveWasCurrent: boolean,
): RecordingEditorState => {
  const savedState = recordingToEditorState(savedRecording);
  return saveWasCurrent
    ? savedState
    : { ...savedState, draft: state.draft };
};

export const recordingDraftWithoutMusicBrainzMatch = (
  draft: RecordingDraft,
): RecordingDraft => ({
  ...draft,
  musicbrainzRecordingId: null,
  musicbrainzReleaseId: null,
  releaseGroup: null,
  personnel: [],
});

export const recordingDraftWithResolvedMatch = (
  draft: RecordingDraft,
  match: ResolvedRecordingMatch,
): RecordingDraft => ({
  ...draft,
  musicbrainzRecordingId: match.recordingId,
  musicbrainzReleaseId: match.representativeReleaseId,
  ...(match.releaseGroup ? { album: match.releaseGroup.title } : {}),
  releaseGroup: match.releaseGroup,
  recordingDateStart: match.recordingDateStart || "",
  recordingDateEnd: match.recordingDateEnd || "",
  recordingLocation: match.recordingLocation || "",
  attribution: match.attribution,
  personnel: match.personnel,
  ...(match.duration ? { duration: match.duration } : {}),
});

export const recordingDraftAfterMusicBrainzLookup = (
  draft: RecordingDraft,
  match: ResolvedRecordingMatch | null,
): RecordingDraft =>
  match ? recordingDraftWithResolvedMatch(draft, match) : draft;

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
          attribution: attributionsToSavePayload(
            draft.releaseGroup.attribution,
          ),
        }
      : null,
    attribution: attributionsToSavePayload(draft.attribution),
    personnel: personnelEntriesToSavePayload(draft.personnel),
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
