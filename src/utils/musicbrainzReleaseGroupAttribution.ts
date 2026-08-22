import {
  musicBrainzRecordingAttribution,
  type RecordingAttributionInput,
} from "./musicbrainzRecordingAttribution.ts";

/**
 * MusicBrainz uses the same ordered artist-credit shape for Release Groups
 * and Recordings. Keep the Release Group entry point distinct so callers
 * cannot accidentally source this shared album credit from a Release.
 */
export const musicBrainzReleaseGroupAttribution = (
  credits: Parameters<typeof musicBrainzRecordingAttribution>[0],
): RecordingAttributionInput[] => musicBrainzRecordingAttribution(credits);
