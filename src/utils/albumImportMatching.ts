import type { ReleaseTracklistItem } from "../lib/musicbrainz.ts";
import type { YtMusicAlbumTrack } from "../lib/ytmusic.ts";

export interface AlbumImportSong {
  id: string;
  title: string;
  canonicalTitle: string;
  musicbrainzWorkId: string | null;
}

export interface AlbumImportMatch {
  mediaTrack: YtMusicAlbumTrack;
  recording: ReleaseTracklistItem | null;
  song: AlbumImportSong | null;
  state: "ready" | "no-song" | "ambiguous-song" | "no-recording" | "ambiguous-recording";
}

export const normalizeAlbumTrackTitle = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\b(album version|bonus track|remaster(?:ed)?|mono|monaural|stereo|version|original mix|feat(?:uring)?\.?)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^(?:a|an|the)\s+/, "")
    .trim();

const normalizeSongTitle = (value: string): string =>
  normalizeAlbumTrackTitle(value)
    .replace(/\b(?:alternate\s+)?take\s+\d+\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const titlesMatch = (left: string, right: string): boolean => {
  const a = normalizeAlbumTrackTitle(left);
  const b = normalizeAlbumTrackTitle(right);
  return a === b || a.replaceAll(" ", "") === b.replaceAll(" ", "");
};

const durationDifference = (
  mediaSeconds: number | null,
  recordingMs: number | null
): number =>
  mediaSeconds === null || recordingMs === null
    ? Number.MAX_SAFE_INTEGER
    : Math.abs(mediaSeconds * 1000 - recordingMs);

export const matchAlbumTracks = (
  mediaTracks: YtMusicAlbumTrack[],
  recordingTracks: ReleaseTracklistItem[],
  songs: AlbumImportSong[]
): AlbumImportMatch[] =>
  mediaTracks.map((mediaTrack) => {
    const recordingCandidates = recordingTracks
      .filter((track) => titlesMatch(track.title, mediaTrack.title))
      .sort(
        (left, right) =>
          durationDifference(mediaTrack.durationSeconds, left.durationMs) -
          durationDifference(mediaTrack.durationSeconds, right.durationMs)
      );
    const firstRecording = recordingCandidates[0] ?? null;
    const firstDifference = firstRecording
      ? durationDifference(mediaTrack.durationSeconds, firstRecording.durationMs)
      : Number.MAX_SAFE_INTEGER;
    const secondDifference = recordingCandidates[1]
      ? durationDifference(mediaTrack.durationSeconds, recordingCandidates[1].durationMs)
      : Number.MAX_SAFE_INTEGER;
    const recordingAmbiguous =
      recordingCandidates.length > 1 &&
      (firstDifference === Number.MAX_SAFE_INTEGER ||
        Math.abs(firstDifference - secondDifference) <= 3_000);

    const songTitle = normalizeSongTitle(mediaTrack.title);
    const songCandidates = songs.filter(
      (song) =>
        normalizeSongTitle(song.title) === songTitle ||
        normalizeSongTitle(song.canonicalTitle) === songTitle
    );
    if (songCandidates.length === 0) {
      return { mediaTrack, recording: firstRecording, song: null, state: "no-song" };
    }
    if (songCandidates.length > 1) {
      return { mediaTrack, recording: firstRecording, song: null, state: "ambiguous-song" };
    }
    if (!firstRecording) {
      return { mediaTrack, recording: null, song: songCandidates[0], state: "no-recording" };
    }
    if (recordingAmbiguous) {
      return { mediaTrack, recording: null, song: songCandidates[0], state: "ambiguous-recording" };
    }
    return {
      mediaTrack,
      recording: firstRecording,
      song: songCandidates[0],
      state: "ready",
    };
  });
