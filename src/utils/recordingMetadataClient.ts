// src/utils/recordingMetadataClient.ts
//
// Thin client-side wrappers around the /api/recording-metadata routes,
// shared between RecordingDetailContent and its match-suggestion UI.

import { RecordingMatchResult } from "@/utils/musicbrainz";

export const searchRecordingMetadata = async (
  title: string,
  artist?: string | null,
  duration?: string | null,
  album?: string | null
): Promise<RecordingMatchResult[]> => {
  const params = new URLSearchParams({ title });
  if (artist) params.set("artist", artist);
  if (duration) params.set("duration", duration);
  if (album) params.set("album", album);

  const response = await fetch(`/api/recording-metadata/search?${params}`);
  if (!response.ok) throw new Error("Search failed");
  const data = await response.json();
  return data.results || [];
};

export const fetchRecordingDetail = async (
  recordingId: string
): Promise<RecordingMatchResult | null> => {
  const response = await fetch(`/api/recording-metadata/recording/${recordingId}`);
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
