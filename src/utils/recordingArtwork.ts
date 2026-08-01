import type { SavedRecording } from "../types/types.ts";
import {
  coverArtUrl,
  releaseGroupCoverArtUrl,
} from "../lib/recordingMetadataClient.ts";
import { youtubeThumbnailUrl } from "../lib/youtube.ts";

export interface RecordingArtwork {
  src: string | null;
  fallbackSrc: string | null;
}

// Resolves the image chain for a Recording: Release Group cover first, then the
// retained representative edition's art (ADR-0008), then the YouTube thumbnail
// for recordings no release context covers at all.
//
// This returns two slots rather than one URL because a present ID is not a
// present image -- Cover Art Archive 404s for plenty of release groups -- so the
// chain has to survive a failed *load*, which only the browser can detect.
// `src` is what we believe is best; `fallbackSrc` is what to try when it fails.
export const recordingArtwork = (
  recording: SavedRecording
): RecordingArtwork => {
  const coverArt =
    releaseGroupCoverArtUrl(
      recording.release_groups?.musicbrainz_release_group_id
    ) ?? coverArtUrl(recording.musicbrainz_release_id);
  const youtubeItem = recording.youtube_items[0];
  const youtubeThumbnail = youtubeItem
    ? youtubeThumbnailUrl(youtubeItem.video_id)
    : null;

  return {
    src: coverArt ?? youtubeThumbnail,
    fallbackSrc: coverArt ? youtubeThumbnail : null,
  };
};
