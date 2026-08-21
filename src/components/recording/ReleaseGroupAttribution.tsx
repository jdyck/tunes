import Link from "next/link";
import type { RecordingAttributionInput } from "@/utils/musicbrainzRecordingAttribution";

export default function ReleaseGroupAttribution({
  attribution,
}: {
  attribution: readonly RecordingAttributionInput[];
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
              href={`/artist/${part.artistId}`}
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
