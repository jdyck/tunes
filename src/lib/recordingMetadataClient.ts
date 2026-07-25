// src/lib/recordingMetadataClient.ts
//
// Thin client-side wrappers around the /api/recording-metadata routes,
// shared between RecordingDetailContent and its match-suggestion UI.

import type {
  RecordingCandidateSet,
  ResolvedRecordingMatch,
} from "@/lib/musicbrainz";

export const searchRecordingMetadata = async (
  title: string,
  artist?: string | null,
  duration?: string | null,
  album?: string | null,
  workId?: string | null,
  albumYear?: string | null
): Promise<RecordingCandidateSet> => {
  const params = new URLSearchParams({ title });
  if (artist) params.set("artist", artist);
  if (duration) params.set("duration", duration);
  if (album) params.set("album", album);
  if (workId) params.set("workId", workId);
  if (albumYear) params.set("albumYear", albumYear);

  const response = await fetch(`/api/recording-metadata/search?${params}`);
  if (!response.ok) throw new Error("Search failed");
  return response.json();
};

export const fetchRecordingDetail = async (
  recordingId: string,
  workId?: string | null
): Promise<ResolvedRecordingMatch | null> => {
  const params = new URLSearchParams();
  if (workId) params.set("workId", workId);
  const response = await fetch(
    `/api/recording-metadata/recording/${recordingId}?${params}`
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.recording || null;
};

// Cover Art Archive serves images by Release MBID, not Recording MBID --
// there's no lookup call needed, the URL convention just works (or 404s,
// for the many releases with no art archived).
export const coverArtUrl = (
  releaseId: string | null | undefined,
  size: 250 | 500 | 1200 = 250
): string | null =>
  releaseId ? `https://coverartarchive.org/release/${releaseId}/front-${size}` : null;

export const releaseGroupCoverArtUrl = (
  releaseGroupId: string | null | undefined,
  size: 250 | 500 | 1200 = 250
): string | null =>
  releaseGroupId
    ? `https://coverartarchive.org/release-group/${releaseGroupId}/front-${size}`
    : null;
