export const acceptedSongFileContentTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type SongFileContentType = (typeof acceptedSongFileContentTypes)[number];

export const MAX_SONG_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export const isSongFileContentType = (
  value: string,
): value is SongFileContentType =>
  acceptedSongFileContentTypes.includes(value as SongFileContentType);

export interface SongFile {
  id: string;
  fileName: string;
  contentType: SongFileContentType;
  sizeBytes: number;
  createdAt: string;
}
