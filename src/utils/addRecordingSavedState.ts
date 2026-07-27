import type { SavedRecording } from "../types/types";

export interface SavedVideoState {
  recordingId: string;
  existedAtOpen: boolean;
}

export interface InitialSavedVideoState {
  savedByVideoId: Record<string, SavedVideoState>;
  duplicateVideoIds: string[];
}

export const deriveInitialSavedVideoState = (
  recordings: SavedRecording[]
): InitialSavedVideoState => {
  const recordingIdsByVideoId = new Map<string, Set<string>>();

  for (const recording of recordings) {
    for (const item of recording.youtube_items) {
      const recordingIds =
        recordingIdsByVideoId.get(item.video_id) ?? new Set<string>();
      recordingIds.add(recording.id);
      recordingIdsByVideoId.set(item.video_id, recordingIds);
    }
  }

  const savedByVideoId: Record<string, SavedVideoState> = {};
  const duplicateVideoIds: string[] = [];

  for (const [videoId, recordingIds] of recordingIdsByVideoId) {
    if (recordingIds.size !== 1) {
      duplicateVideoIds.push(videoId);
      continue;
    }

    savedByVideoId[videoId] = {
      recordingId: [...recordingIds][0],
      existedAtOpen: true,
    };
  }

  return { savedByVideoId, duplicateVideoIds: duplicateVideoIds.sort() };
};

export const markVideoSaved = (
  state: Record<string, SavedVideoState>,
  videoId: string,
  recordingId: string
): Record<string, SavedVideoState> => ({
  ...state,
  [videoId]: { recordingId, existedAtOpen: false },
});

export const markVideoRemoved = (
  state: Record<string, SavedVideoState>,
  videoId: string
): Record<string, SavedVideoState> => {
  const next = { ...state };
  delete next[videoId];
  return next;
};

export const markRecordingRemoved = (
  state: Record<string, SavedVideoState>,
  recordingId: string
): Record<string, SavedVideoState> =>
  Object.fromEntries(
    Object.entries(state).filter(
      ([, saved]) => saved.recordingId !== recordingId
    )
  );

export const reconcileSavedVideoState = (
  recordings: SavedRecording[],
  sessionRecordingIds: ReadonlySet<string>
): InitialSavedVideoState => {
  const refreshed = deriveInitialSavedVideoState(recordings);

  return {
    ...refreshed,
    savedByVideoId: Object.fromEntries(
      Object.entries(refreshed.savedByVideoId).map(([videoId, saved]) => {
        return [
          videoId,
          {
            ...saved,
            existedAtOpen: !sessionRecordingIds.has(saved.recordingId),
          },
        ];
      })
    ),
  };
};
