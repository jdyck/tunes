import {
  isSongFileContentType,
  MAX_SONG_FILE_SIZE_BYTES,
} from "@/types/songFiles";
import type { SongFileContentType } from "@/types/songFiles";

export {
  acceptedSongFileContentTypes,
  isSongFileContentType,
  MAX_SONG_FILE_SIZE_BYTES,
} from "@/types/songFiles";

const contentTypeLabels: Record<SongFileContentType, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "image/webp": "WebP image",
};

export const validateSongFile = (file: Pick<File, "size" | "type">) => {
  if (!isSongFileContentType(file.type.toLowerCase())) {
    return "Choose a PDF, JPEG, PNG, or WebP file.";
  }
  if (file.size === 0) return "The file is empty.";
  if (file.size > MAX_SONG_FILE_SIZE_BYTES) {
    return "Files must not exceed 15 MiB.";
  }
  return null;
};

export const songFileContentTypeLabel = (contentType: SongFileContentType) =>
  contentTypeLabels[contentType];

export const formatSongFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KiB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
};
