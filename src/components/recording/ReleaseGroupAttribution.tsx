import Link from "next/link";
import type { RecordingAttributionInput } from "@/utils/musicbrainzRecordingAttribution";

export default function ReleaseGroupAttribution({
  attribution,
  songId,
  recordingId,
}: {
  attribution: readonly RecordingAttributionInput[];
  songId: string;
  recordingId: string;
}) {
  if (attribution.length === 0) return null;

  return (
    <span className="whitespace-pre-wrap">
      {attribution.map((part, index) => (
        <span
          key={`${index}-${part.artistId ?? part.musicbrainzArtistId ?? part.creditedAs}`}
        >
          {part.artistId ? (
            <Link
              href={`/song/${songId}/recording/${recordingId}/artist/${part.artistId}`}
              className="text-azure-700 underline"
            >
              {part.creditedAs}
            </Link>
          ) : (
            part.creditedAs
          )}
          {part.joinPhrase}
        </span>
      ))}
    </span>
  );
}
